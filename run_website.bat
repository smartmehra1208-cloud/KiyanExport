@echo off
title Kiora Wellness - B2C Herbal Store Server
echo ====================================================
echo 🌿 Starting Kiora Wellness B2C Engine (Est. 2014)...
echo 💻 Local Machine URL: http://localhost:3000
echo 📱 Personal / Network IP: (Displayed by server upon launch)
echo ====================================================
cd /d "%~dp0"
start "" http://localhost:3000
npm start
pause
