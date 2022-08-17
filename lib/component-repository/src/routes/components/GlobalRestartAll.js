const mongoose = require('mongoose');
const Component = require('../../models/Component');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = async function (req, res) {
    let {emitThrottle, restartDelay} = req.query;
    if(!emitThrottle && emitThrottle != 0) emitThrottle = 10;
    if(!restartDelay && restartDelay != 0) restartDelay = 2;

    emitThrottle = emitThrottle * 1000;
    restartDelay = restartDelay * 1000;

    req.logger.debug('emitThrottle', emitThrottle);
    req.logger.debug('restartDelay', restartDelay);

    try {
      const components = await Component
        .find({isGlobal: true, active: true})
        .select({isGlobal: 1, active: 1})
        .lean();

      req.logger.debug(components);

      res.status(200).send({ message: `${components.length} Components will be restarted`, code: 200 })

      for(let i=0; i<components.length; i+=1) {
        const componentId = components[i]._id;
        if(i>0) await sleep(emitThrottle);

        const stopEvent = {
           headers: {
             name: 'component.stopping',
           },
           payload: {
             '_id': componentId,
             stoppedBy: req.user.sub,
           },
         };

         try {
           const newEvent = req.eventClass ? new req.eventClass(stopEvent) : stopEvent;
           await req.eventBus.publish(newEvent);
           req.logger.info(`Published event: ${JSON.stringify(stopEvent)}`);

           const res = await Component.updateOne({ '_id': componentId }, { $set: { active: false } });

           req.logger.debug('componentId', componentId);
           req.logger.debug('res', res);

         } catch (err) {
           req.logger.error(err);
         }

        setTimeout(async ()=>{
          const startEvent = {
             headers: {
               name: 'component.starting',
             },
             payload: {
               '_id': componentId,
               startedBy: req.user.sub,
             },
           };

           try {
             const newEvent = req.eventClass ? new req.eventClass(startEvent) : startEvent;
             await req.eventBus.publish(newEvent);
             req.logger.info(`Published event: ${JSON.stringify(startEvent)}`);

             const response = await Component.updateOne({ '_id': componentId }, { $set: { active: true } });
             req.logger.debug('componentId', componentId);
             req.logger.debug('response', response);
           } catch (err) {
             req.logger.error(err);
           }
        }, restartDelay);

      }
    } catch(err) {
      req.logger.error(err);
    }
};
