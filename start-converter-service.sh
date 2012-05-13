#!/bin/sh
echo make sure you compile the service using mvn clean install in the converter-service/converter folder
echo starting openoffice headless
/Applications/OpenOffice.org.app/Contents/MacOS/soffice.bin -headless -nofirststartwizard -accept="socket,host=localhost,port=8100;urp;StarOffice.Service" &
OFFICE_PID=$!
echo waiting for service to start
sleep 3
echo starting java service
java -jar converter-service/converter/target/converter-1.0-SNAPSHOT.jar
#kill $OFFICE_PID
