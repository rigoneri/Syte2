###Getting started and initial content changes

The first step is to fork Syte2. If you plan to contribute to the project and make pull request I also recommend you *branching* your fork. If you don't know what that means or how to do that just [follow these steps](https://help.github.com/articles/fork-a-repo).

##Pictures

To start off change the pictures to have your picture, navigate to `client > app > images` and replace all **apple-touch-icons**, **favicon.ico** and **pic.jpg** to be your picture. Just don't replace **placeholder.png** since it's used for lazy loading images. Also make sure to keep the same sizes.

##Text changes

Navigate to `client > app > index.html` and make the following changes:

1. Change `title` tag to have your name.
2. Change `meta="description"` to have a description about you.
3. Change `meta="keywords"` to have keywords about you.

Then navigate to `client > app > templates > nav.html` and change the **h1** tag to have your name.

## Environment Variables

Navigate to `client > app > scripts` duplicate the `sample-env.js` file and rename it to `env.js`.

If you plan on using *Google Analytics* add your google analytics key to the `GOOGLE_ANALYTICS_KEY` variable. Don't worry about `GOOGLE_MAPS_KEY` for now, we will add it later.

Then navigate to the `server` folder and duplicate the `.sample-env` file and rename it to `.env`

## Install Node.js and Bower

First go to <https://nodejs.org> and download the installer to install node.js.

Then open the terminal and run `npm install -g bower` to install bower.

Next navigate to the `client` folder and first run `bower install` and then run `npm install` to install all the dependencies used by the client.

Next navigate to the root folder and run `npm install` to install all the dependencies used by the server.

`Note: Heroku requires to have package.json in the root folder, that's why it's not in the server folder`

## Install and Run MongoDB

First go to <https://www.mongodb.com> and download the installer to install MongoDB.

Then follow the [these instructions](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/#run-mongodb) to run MongoDB locally.

---

Next: [Running the project locally](running.md)
