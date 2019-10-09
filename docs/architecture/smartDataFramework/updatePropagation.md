# Introduction

If a message is sent to the Open Integration Hub via a connector flow there are several services wihtin the OIH that collaborate in order to propagate this message.

## Description

This document describes two cases of message propagation via the Smart Data Framework. The first one represents the sequence that is used to send a create event while the second describes the propagation of a delete or update event.

## Create Events

The following figure shows what happens within the Smart Data Framework if  a create event is received.

![CreateEvent](assets/Create-SDFCommunication.png)

## Delete or Update Events

The following figure shows what happens within the Smart Data Framework if  a delte or update event is received.

![updateOrDelete](assets/UpdateOrDelete-SDFCommunication.png)
