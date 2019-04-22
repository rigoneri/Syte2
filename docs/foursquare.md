### Setting up Foursquare

To get started, create a new application on Foursquare for your website by going to <https://foursquare.com/developers/apps>.

Enter the **Application Name**, **Welcome page url** and **Redirect URIs**. For the redirect URL enter `http://localhost:3000/foursquare/auth`. Once you are done registering you will be given a **Client ID** and **Client Secret**.

Once you have those four items open the `server > .env` file and enter:

* **Client ID** string under `FOURSQUARE_CLIENT_ID`
* **Client Secret** string under `FOURSQUARE_CLIENT_SECRET`

Also make sure to set:

* `FOURSQUARE_INTEGRATION_DISABLED` to false
* `FOURSQUARE_OAUTH_ENABLED` to true
* `FOURSQUARE_UPDATE_FREQ_MINUTES` to the number of minutes you want to wait before updating the data. `Note` A small number is not always the best and it might make Syte2 slow, use a number close to how often you use Foursquare.

Next, restart the server and open the following url <http://localhost:3000/foursquare/auth>, you will be taken to Foursquare's website and will be asked to sign in and authorize your application. After you authorized you will be taken back to Syte2 and you will be given your **Access Token**. Open the `server > .env` file again and enter:

* **Access Token** under `FOURSQUARE_ACCESS_TOKEN`

Next, restart the server and open the following url <http://localhost:3000/instagram/setup>. If everything is setup right, this will fetch some of your recent check-ins and save them to the database. Next we need to setup **map** we use in the Foursquare page.

## Setting Google Maps

In order to set up Google Maps we need to get an API Key from Google. If you haven't done so, login to the Google Developers Console by going to <https://console.developers.google.com>. Navigate to `API Manager > Credentials` and create a new project, after that's done go to the [OAuth consent screen](https://console.developers.google.com/apis/credentials/consent) and enter a **Product name** (all other fields are optional).

Next click on `Create credentials > API Key > Browser Key` and enter the following:

* **Name:** Syte
* **Accept requests from these HTTP referrers:** Enter ***http://localhost:3000*** and your webstie url (ex. ***http://rigoneri.com***)

Once you are done you will be given a **API Key**, open the file `client > app > scripts > env.js` and enter the key under `GOOGLE_MAPS_KEY`.

Restart the server and re-run `grunt serve` from the client folder. You should now be able to go to <http://localhost:3000> and see that any recent check-ins in your stream and at this point your Foursquare page should also be working.

---

Next: [Setting up Tumblr](tumblr.md)
