<p align="center">
  <img src="https://raw.githubusercontent.com/openintegrationhub/openintegrationhub/master/Assets/medium-oih-einzeilig-zentriert.jpg" alt="OIH Logo" width="400"/>
</p>

The revolution in data synchronization — the Open Integration Hub enables simple data synchronization between any software applications and thus accelerates digitalisation

Visit the official [Open Integration Hub homepage](https://www.openintegrationhub.de/)

# Conflict Management (CFM)
The OIH Conflict Management is an optional module that can be included as part of an adapter, in order to automatically resolve potential conflicts according to a set of adapter-developer-defined rules. The CFM's implementation is generic and class-based, allowing an adapter developer to create and add new rules specific to an application's requirements.

## Usage
Within a connector flow, the CFM can be included in an adapter that connects to a target application it pushes data to. To do this, an adapter developer can include the CFM moduel into their adapter, set it up as desired, and then use it to process potential conflicts.

To use the CFM, the adapter needs to pass it two objects: First, the incoming object from the connecting flow, and secondly the corresponding object from the target application's data store, if such an object exists. If the second object can not be uniquely identified, the adapter can also supply a best guess for a match, and configure the CFM to handle this case. These objects must both be converted to JSON before passing them on to the CFM. The CFM has no requirements to the object schema, only both objects use the same schema. After resolution is complete, the CFM will return a reconciled object in the same schema, which the adapter can then pass on to the target applications.

The CFM operates on a set of *Rules*. Each rule is associated with a given number of object keys to which it applies. During conflict resolution, both the source and target values of that key are passed on to their associated *Rule*, which attempts to reconcile any differences according to a set of internal *Resolvers*, and returns the reconciled value.

Both sets of *Rules* and *Resolvers* are expandable. Should the included default selection be unsuitable for a particular application, the adapter developer can add their own *Rules* and/or *Resolvers* in place and use them right away.

<p align="center">
  <img src="https://raw.githubusercontent.com/openintegrationhub/openintegrationhub/master/lib/cfm/assets/CFM.png" alt="OIH-CFM workflow" width="400"/>
</p>

## Technical description
The CFM offers three classes, which each expose a number of functions for developer to customize its behaviour.

### CFM
The CFM itself is the top-level module. It is instantiated during the initialisation of an adapter, containing all configuration data. During actual data transfer, it can then be called to handle conflict management. It exposes these functions:

#### `setRules({ruleName: [key, key2]})`
Accepts an object with the name of used rules as keys, and arrays of strings as values.

The primary function of CFM configuration. This maps a particular rule to a list of key names. Each rule can be set only once, duplicate assignments within the same function call are rejected. Keys that have not been assigned to a rule automatically use a default rule.

#### `setDefaultRules(ruleName: somename})`
Accepts an object with the name of used rules as keys and an arbitrary name as value.

Each key can only be set once, duplicate assignments within the same function call are rejected.

This function adds a particular rule to a list of default rules. Default rules are only executed if there is key for which no other rule is specified.

The default configuration is the rule *onlyOverwriteEmpty* which will only add values to the target if the target does not have the key or the value is empty.

The *default rules can be deactivated* by calling with an empty object. Ie.: `setDefaultRules({});`


#### `setGlobalRules({ruleName: somename})`
Accepts an object with the name of used rules as keys and an arbitrary name as value.

The primary function of global CFM configuration. This adds a particular rule to a list of global rules. Each key can only be set once, duplicate assignments within the same function call are rejected.

#### `addCustomRule(name, [resolver])`
Accepts a string as name for the rule, and an ordered array of resolvers to be used, referenced by name. Rule name cannot be a duplicate, all assigned resolvers must exist.

This allows the developer to add a new rule, using a custom set of resolvers. Resolvers are applied in the order they are entered in the array. Check the example Rules for further information.

#### `addCustomResolver(name, function)`
Accepts a string as a name for the resolver, and a javascript function as its function. Resolver name cannot be duplicate. The function must accept exactly two arguments, and return either a value of the same type, or `false` in case resolution is impossible. See the example Resolvers for further information.

#### `resolve(incomingObject, targetObject)`
Accepts two JSON objects, which must use the same schema. Returns a JSON object of the same schema, or `false`.

The core function of the CFM. This applies the rules set during configuration to both objects and creates a new one with all conflicts resolved. If reconciliation fails or the conflicts are irresolvable, it instead returns `false`.

### Rule
Rules are the core building block of the CFM. A Rule is essentially a sequence of predefined functions (called *Resolvers*) that receive two potentially conflicting data values (which can be in any Javascript format: String, Number, Object, Array, etc.) and attempt to resolve this conflict. If successful, the rule will return the new reconciled value.

The primary consideration when creating a rule is the selection and order of Resolvers. Resolvers are applied in the specific order they were added to the Rule. The first Resolver that produces a resolution "wins", and any further Resolvers are no longer used.

Rules can be created and applied through the functions exposed by the CFM. The adapter should not manipulate rules directly.

### predefined rules

`copyNew`: Is copying data from incoming to target if incoming is not empty.

`rejectEmpty`: Is copying data from incoming to target event if incoming is empty.

`onlyOverwriteEmpty`: Only copies data from incoming to target if data in target is undefined or empty.

`ifUpdate`: Is copying data from incoming to target if all keys exists in both objects and at least one value of incoming is not empty.

`uniqArray`: Takes two array values as input and compares all elements to each other and returns an merged array without duplicates.

### predefined global rules

`ResolverSkipDuplicateEntry`: Compares incoming data to target data and makes CFM return `{}` if it is an exact duplicate.

### Resolver
Resolvers are the lowest-level component of the CFM. They contain a single arbitrary function that takes two data values and attempt to find a reconciliation for them. If successful, the reconciled value is returned as an object in the following form: `{value:returnedData}`.

If no reconciliation can be found, they should instead return `false`.

New Resolvers can be created and assigned through functions of the CFM, and are executed automatically by the Rules they are assigned to. The adapter should not manipulate Resolvers directly.

Resolvers used in global rules should return an empty object "{}" if an entry is supposed to be skipped.

## Examples
Creating two custom resolvers, for handling a particular type of object
```javascript
const CFM = require('@wice-devs/cfm')

// This resolver checks whether a certain field in the incoming object matches the value of the target object
// If it does not, the reference has been changed, any data of the target object is outdated, and only the incoming data is used
// If it does match, this is not the case, the resolver returns false, and the issue is passed on to the next resolver in line.
CFM.addCustomResolver('overwriteIfNew', (incoming, target) => {
  if (incoming.lastName !== target.lastName) return {value: incoming}
  else return false
})

// This resolver performs a soft merge, where only empty fields of the target object
// are filled with values from the incoming object
CFM.addCustomResolver('fillOnlyEmptyFields', (incoming, target) => {
  const resolvedObject = target;

  for key in incoming {
    if (target[key] === undefined) {
      resolvedObject[key] = incoming[key];
    }
  }

  return resolvedObject;
})
```

Creating a custom rule, using the resolvers created earlier:
```javascript
// This rule applies first the "overwriteIfNew" resolver, then the "fillOnlyEmptyFields" one
// If the incoming object lacks the required keys, it is discarded entirely by rejectIfIncomplete
// If it does not, it is passed on and next handled by the fillOnlyEmptyFields resolver, which enriches the target object without overwriting existing data
CFM.addCustomRule('enrichPersonData', ['overwriteIfNew', 'fillOnlyEmptyFields'])
```

Finally, assigning the rule to the appropriate object keys:
```javascript
CFM.setRules({'enrichPersonData': ['recipient']})
```

## Local installation/development

Do `npm install --save @wice-devs/cfm` and implement the following code in your adapter:

```javascript
const CFM = require('../index');
const cfm = new CFM();
// add your CFM Config here like explained above or see test folder for examples
const result = cfm.resolve(incomingData, localData);
```

Where localData has to be provided from your system and incomingData is the data passed from the transformer.

the result will be an newObject based on the applied resolvers.

If the *result object is an empty object* then this means the incomingData should be discarded. For example if a global resolver identifies it as an exact copy of the localData.
