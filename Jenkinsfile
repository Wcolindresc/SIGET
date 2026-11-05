pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds(); timeout(time: 60, unit: 'MINUTES') }
  environment {
    CI = 'true'
    COMPOSE_PROJECT_NAME = 'siget-ci'
    DB_SVC  = 'postgres'
    API_SVC = 'backend'
    API_URL = 'http://localhost:3000'
    CLOUD_API = 'https://siget-backend-lmvf.onrender.com'
  }
  stages {
    stage('1. Compilacion') {
      steps {
        dir('backend')  { sh 'npm ci && npx prisma generate && npm run build' }
        dir('frontend') { sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi; npm run build' }
      }
    }
    stage('2. Pruebas unitarias') {
      steps {
        dir('backend')  { sh 'npx jest --ci --coverage --reporters=default --reporters=jest-junit' }
        dir('frontend') { sh 'npx vitest run --coverage --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml' }
      }
      post { always { junit allowEmptyResults: true, testResults: 'backend/junit.xml,frontend/reports/junit.xml' } }
    }
    stage('3. Analisis estatico') {
      steps {
        withSonarQubeEnv('sonarqube') {
          sh 'npx -y @sonar/scan -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.token=$SONAR_AUTH_TOKEN -Dsonar.projectVersion=$BUILD_NUMBER'
        }
      }
    }
    stage('3.1 Quality Gate') {
      steps { timeout(time: 10, unit: 'MINUTES') { waitForQualityGate abortPipeline: true } }
    }
    stage('4. Pruebas de API') {
      steps {
        sh 'cp -n .env.example .env || true'
        sh 'docker compose up -d --build $DB_SVC $API_SVC'
        sh 'for i in $(seq 1 60); do curl -sf $API_URL/api/docs-json > /dev/null && exit 0; sleep 5; done; echo "La API no respondio"; exit 1'
        withCredentials([string(credentialsId: 'siget-seed-password', variable: 'SEED_PWD')]) {
          sh '''
            mkdir -p reports/newman
            npx -y -p newman@6 -p newman-reporter-htmlextra newman run postman/SIGET.postman_collection.json \
              -e postman/SIGET.local.postman_environment.json \
              --env-var "base_url=$API_URL" --env-var "password=$SEED_PWD" \
              -r cli,junit,json,htmlextra --suppress-exit-code \
              --reporter-junit-export reports/newman/api.xml \
              --reporter-json-export reports/newman/api.json \
              --reporter-htmlextra-export reports/newman/index.html
          '''
        }
        script {
          def code = sh(returnStatus: true, script: '''node -e "
            const f = require('./reports/newman/api.json').run.failures.map(x => (x.error && (x.error.test || x.error.message)) || 'error');
            const reales = f.filter(t => !/^H-0/.test(t));
            console.log('Fallos reales: ' + reales.length + ' | Hallazgos conocidos (carpeta 09): ' + (f.length - reales.length));
            reales.forEach(t => console.log(' - ' + t));
            process.exit(reales.length ? 1 : 0);"''')
          if (code != 0) { error('Fallaron pruebas de API fuera de la carpeta 09') }
        }
      }
      post {
        always {
          junit allowEmptyResults: true, skipMarkingBuildUnstable: true, testResults: 'reports/newman/api.xml'
          publishHTML(target: [reportDir: 'reports/newman', reportFiles: 'index.html', reportName: 'Newman',
                               keepAll: true, alwaysLinkToLastBuild: true, allowMissing: true])
          sh 'docker compose down -v || true'
        }
      }
    }
    stage('5. Despliegue') {
      when { branch 'main' }
      steps {
        withCredentials([string(credentialsId: 'render-hook-backend', variable: 'HOOK_BE'),
                         string(credentialsId: 'render-hook-frontend', variable: 'HOOK_FE')]) {
          sh 'curl -fsS -X POST "$HOOK_BE" && curl -fsS -X POST "$HOOK_FE"'
        }
        sh 'sleep 90; for i in $(seq 1 40); do curl -sf $CLOUD_API/api/docs-json > /dev/null && exit 0; sleep 15; done; exit 1'
      }
    }
  }
  post {
    always { archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true }
  }
}
