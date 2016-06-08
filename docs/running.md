If you haven't done so, please follow the instructions on [getting started and initial content changes](start.md)

###Running the project locally

Before running the project, make sure you have MongoDB running.

Your probably noticed by now that the project is split into 2 folders `client` and `server`.

The client folder is where the *AnuglarJS* project lives along with all HTML and LESS(css) files. Using the terminal, navigate to the client folder and run `grunt serve`, this will covert the LESS files into CSS and validate the JavaScript.

The server folder is where the *Express* project lives along with the APIs and database code. Using the terminal, navigate to the server folder and run 'node app.js', if you rather have the app to auto reload whenever you make some server changes you could run `nodemon app.js` instead.

After both projects are running you should be able to run the project on <http://localhost:3000> however you still need to setup social integrations.

  * [Setting up Twitter](twitter.md)
  * [Setting up Github](github.md)
  * [Setting up Dribbble](dribbble.md)
  * [Setting up Spotify & Last.fm](lastfm.md)
  * [Setting up Instagram](instagram.md)
  * [Setting up YouTube](youtube.md)
  * [Setting up Foursquare](foursquare.md)
  * [Setting up Tumblr](tumblr.md)

After setting up the social integrations you want. Open the `client > templates > nav.html` file and under `nav` either remove or comment out the integrations you didn't use.
