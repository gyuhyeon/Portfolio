# Simple documentation for future reference

## Node.js with Nginx
Node.js can act as a standalone web server, but it's more stable/robust if nginx is used as a proxy server and node.js receives requests through nginx.  
The structure is as follows:  
```
[Node.js app] <- HTTP(but port can be anything) -> [Nginx] <- HTTP(80)/HTTPS(443) -> [CLIENT]
```
- Install nginx
```
$ sudo apt-get update && sudo apt-get upgrade -y
$ sudo apt-get install nginx -y
```
- nginx checkup
```
$ sudo systemctl status nginx    # To check the status of nginx
$ sudo systemctl start nginx     # To start nginx
$ sudo systemctl enable nginx
```
- Configure nginx to act as a proxy
```
$ wget -q -O - 'http://169.254.169.254/latest/meta-data/local-ipv4'    # get private IP of the server (different from elastic public IP. Private IP is given to corporations.)
$ sudo rm /etc/nginx/sites-available/default    # we don't need preset configs
$ sudo vi /etc/nginx/sites-available/default    # make new one
server {
    listen 80;
    server_name your_domain.com;
    location / {
        proxy_pass http://private_ip_address:9000; # change 9000 to whatever port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
     }
}
```
- test nginx config
```
$ sudo nginx -t
$ sudo /etc/init.d/nginx reload   # reload if config was OK
```
- make node.js server listen to private IP at port specified in config above
```
app.listen(9000, 'private_ip_address');
```

## Node.js with HTTPS & Nginx
```
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name domain.example.com;
    return 301 https://$server_name$request_uri;
}
server {
   # SSL configuration
   listen 443 ssl http2 default_server;
   listen [::]:443 ssl http2 default_server;
   include your_ssl_certificate;
    location / {
        proxy_set_header X-Forwarded-Proto https;
        proxy_pass http://private_ip:port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
   }
}
```

[Reference article](https://medium.com/@utkarsh_verma/configure-nginx-as-a-web-server-and-reverse-proxy-for-nodejs-application-on-aws-ubuntu-16-04-server-872922e21d38)  
[Digital ocean reference](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04)  