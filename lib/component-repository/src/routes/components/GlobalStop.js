const mongoose = require('mongoose');
const Component = require('../../models/Component');

module.exports = async function (req, res) {
    const componentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(componentId)) {
      return res.status(400).send({ errors: [{ message: 'Invalid id', code: 400 }] });
    }

    const componentData = await Component.findOne({'_id': componentId}).lean();

    req.logger.debug(componentData);

    if(!componentData.isGlobal) {
      return res.status(401).send({ errors: [{ message: 'Component is not global', code: 401 }] });
    }

    delete componentData.owners;

    const ev = {
       headers: {
         name: 'component.stopping',
       },
       payload: componentData,
     };

    ev.payload.stoppedBy = req.user.sub;

    try {
      const newEvent = new req.eventClass(ev);
      await req.eventBus.publish(newEvent);
      req.logger.info(`Published event: ${JSON.stringify(ev)}`);
    } catch (err) {
      req.logger.error(err);
    }

    return res.status(200).send({ message: 'Component stopped', code: 200 });
};
