@echo off
cd /d C:\Users\Mohan\Documents\CC\llm-coding-eval
set PATH=C:\Program Files\nodejs;C:\Users\Mohan\AppData\Roaming\npm;%PATH%
set MODEL=deepseek33b
set OLLAMA_BASE_URL=http://localhost:11434
set OLLAMA_TIMEOUT_MS=600000
echo Running SCHEDULER-ONLY tests with MODEL=%MODEL% > test-deepseek33b-scheduler.log 2>&1
npx jest --runInBand --forceExit --testTimeout=600000 --testPathPattern "scheduler" >> test-deepseek33b-scheduler.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> test-deepseek33b-scheduler.log
