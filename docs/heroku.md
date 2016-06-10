##Deploying to Heroku

First, sign up to [Heroku](http://heroku.com) and download and install [Heroku Toolbet](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up), using the terminal in the Syte2 project make sure you can login to heroku `heroku login`.

Next, navigate to the [Heroku dashboard](https://dashboard.heroku.com/apps) and create a new app. Enter a **App Name**, this needs to be unique, for this example we will use **syte2**. In the ***Resources*** page under **Add-ons**, search for `mLab MongoDB` and select `Sandbox - Free` as the plan name.

Next, navigate to the ***Settings*** page and under **Config Variables** click on ***Reveal Config Vars***, you should already see `MONGODB_URI` already set, now we need to add some variables from the `server > .env` file, enter the following:

* `TZ` to your timezone, pick one from [this list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) if you don't know which one to use. (ex. `America/Chicago`)
* `SETUP_ENABLED` to `true`

---

If you integrated with Twitter enter:

* `TWITTER_USERNAME`
* `TWITTER_CONSUMER_KEY`
* `TWITTER_CONSUMER_SECRET`
* `TWITTER_ACCESS_TOKEN_KEY`
* `TWITTER_ACCESS_TOKEN_SECRET`
* `TWITTER_UPDATE_FREQ_MINUTES`

If you didn't integrate with Twitter enter:

* `TWITTER_INTEGRATION_DISABLED` to `true`

---

If you integrated with Instagram enter:

* `INSTAGRAM_ACCESS_TOKEN`
* `INSTAGRAM_UPDATE_FREQ_MINUTES`

If you didn't integrate with Instagram enter:

* `INSTAGRAM_INTEGRATION_DISABLED` to `true`

---

If you integrated with Foursquare enter:

* `FOURSQUARE_ACCESS_TOKEN`
* `FOURSQUARE_UPDATE_FREQ_MINUTES`

If you didn't integrate with Foursquare enter:

* `FOURSQUARE_INTEGRATION_DISABLED` to `true`

---

If you integrated with Dribbble enter:

* `DRIBBBLE_USERNAME`
* `DRIBBBLE_ACCESS_TOKEN`
* `DRIBBBLE_UPDATE_FREQ_MINUTES`

If you didn't integrate with Dribbble enter:

* `DRIBBBLE_INTEGRATION_DISABLED` to `true`

---

If you integrated with Tumblr enter:

* `TUMBLR_BLOG`
* `TUMBLR_API_KEY`
* `TUMBLR_UPDATE_FREQ_MINUTES`

If you didn't integrate with Tumblr enter:

* `TUMBLR_INTEGRATION_DISABLED` to `true`

---

If you integrated with Github enter:

* `GITHUB_ACCESS_TOKEN`
* `GITHUB_USERNAME`
* `GITHUB_UPDATE_FREQ_MINUTES`

If you didn't integrate with Github enter:

* `GITHUB_INTEGRATION_DISABLED` to `true`

---

If you integrated with Last.fm enter:

* `LASTFM_API_KEY`
* `LASTFM_USERNAME`
* `LASTFM_UPDATE_STREAM_FREQ_MINUTES`
* `LASTFM_UPDATE_FREQ_MINUTES`

If you didn't integrate with Last.fm enter:

* `LASTFM_INTEGRATION_DISABLED` to `true`

---

If you integrated with YouTube enter:

* `YOUTUBE_CLIENT_ID`
* `YOUTUBE_CLIENT_SECRET`
* `YOUTUBE_ACCESS_TOKEN`
* `YOUTUBE_REFRESH_TOKEN`
* `YOUTUBE_PLAYLIST_ID`
* `YOUTUBE_UPDATE_FREQ_MINUTES`

If you didn't integrate with YouTube enter:

* `YOUTUBE_INTEGRATION_DISABLED` to `true`

---

Next, we need to get the project ready to deploy. Navigate to the `client` folder and run `grunt clean --force` and then `grunt build --force` this will group and minify all of HTML, JavaScript and CSS files from the client folder and place them in the `server > dist` folder, before continuing make sure that folder is not empty.

Next we need to add the heroku repo to your project and deploy the code. In the root folder of Syte2 run the following:

* `heroku git:remote -a syte2` where `syte2` needs to be replaced with your Heroku application name.
* `git add .`
* `git commit -am "Syte initial deployment"`
* `git push heroku master`

After that is done and you if have successfully deployed the code go to `http://APPNAME.herokuapp.com/stream/setup` (replace APPNAME with your heroku application name). This will download all the integrations' data to the ***mLab - MongoDB*** database. If everything went well you should be able to go to `http://APPNAME.herokuapp.com` and the app should be running.

If everything went well here are a few things you should do:

* Set `SETUP_ENABLED` to `false` in the Heroku's **Config Variables**
* Setup [your custom domain name](https://devcenter.heroku.com/articles/custom-domains)

***I also suggest*** you to upgrade to the [Hobby](https://www.heroku.com/pricing) level of Heroku, so your website is up all day, otherwise on the `Free` level your website will go to "sleep" after 30 mins of inactivity, and every time it wakes up it will take some time.
