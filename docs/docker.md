##Deploying with Docker

This method will allow you to run project on any machine that can run Docker. For example, I use AWS EC2 to host it.

1. Install [Docker](https://www.docker.com/)
2. Follow all instructions at [Getting started and initial content changes](start.md)
3. Build Docker container by `docker build -t syte2 .`
4. Run Docker contailer by `docker run --restart=always --network=host syte2`

Now you should be able to run project <http://localhost:3000>
