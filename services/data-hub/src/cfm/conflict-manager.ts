const CFM = require('@wice-devs/cfm')  // eslint-disable-line

const cfm = new CFM();

// Set rules for address-schema
cfm.setRules({
    uniqArray: ['addresses', 'contactData', 'categories'],
    copyNew: [
        'middleName',
        'jobTitle',
        'photo',
        'gender',
        'nickname',
        'language',
        'displayName',
        'title',
        'salutation',
        'birthday',
        'logo'
    ],
    rejectEmpty: ['firstName', 'lastName', 'name']
})

export default function resolveConflict(incoming: object, target: object): object | null {
    try {
        return cfm.resolve(incoming, target);
    } catch (err) {
        return incoming;
    }
}
