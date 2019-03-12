# Messageformat


```
{
    headers:{
        eventId: String,
        createdAt: String,
        causalId: String,
        eventSource: String,
        eventName: String,
    },
    payload: {}
}
```

eventId: it might be good to have an Id which is increasing and in sequential order so it it is always known which message came first.

timeStamp: because some operations might be time-dependent

causalId: in case the event is caused by a previous event. For example in a sequence.

eventSource: the origin of the event ie. the service that created it

payload: the object which carries the data of the eventId

- Do we need to specify the payload further...?
