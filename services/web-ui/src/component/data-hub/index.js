import React from 'react';

const DataHub = () => {
    const world = {
        domainID: 'D123eaedasdasadwDasda',
        schemaURI: 'https://foobar.de/asdf',
        content: {
            example: 'test',
        },
        refs: { applicationUid: 123, recordUid: 456, modifications: { user: 'Max Mustermann', operation: 'editted', timestamp: '24.04.2021' } },
        owners: { id: 1423, type: 'admin' },
    };

    return (<div>
        <p>Domain-ID: D123eaedasdasadwDasda</p>
        <p>Schema-URI: https://foobar.de/asdf</p>
        <p>Content: First name: Max, Last name: Mustermann</p>
        <p>Refs: applicationUid: 123, recordUid: 456, modifications: Max Mustermann, editted, 28.01.2021</p>
        <p>Owners: id: 1707, type: admin</p>
        <div>{JSON.stringify(world, null, 2)}</div>
    </div>);
};

export default DataHub;
