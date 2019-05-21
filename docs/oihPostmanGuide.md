# Introduction

This document is designed as a guide on _how to propely use the open integration hub with postman_.

## Prerequisites

In order to use the Open Integration Hub we provided a [postman collection](postman/OIH_Framework_Showcase.postman_collection.json) and a [postman environment](OIH_Framework.postman_environment.json).

We suggest to download and import these files to easily process the steps described in the following.

## SetUp

Before you start using the framework you need a user account (username & passoword). Please request a new account from [@philecs](https://github.com/philecs). E-Mail: <philipp.hoegner@cloudecosystem.org>.

It is necessary to add valid user data in order to perform the requests.
Please process the following steps in order to be able to generate a valid token for the requests:

1. Right click on the `OIH_SHOWCASE_COLLECTION` and click on `edit` OR click on the three dots `...` and click `edit`.
2. Jump to `Pre-request Scripts`
3. Replace `{YOUR_USERNAME}` with the username you received
4. Replace `{YOUR_PASSWORD}` with the password you received
5. Click on `Update`

Here you can see where you should add the username and password:
![usrName_pw](assets/postmanToken.PNG)

Now you can proceed and use the predefined requests.

## Use Cases