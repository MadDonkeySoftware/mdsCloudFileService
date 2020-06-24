#!/bin/sh
sudo docker build -t 192.168.5.90:5000/frito/mds-file-service:latest .
sudo docker push 192.168.5.90:5000/frito/mds-file-service:latest
