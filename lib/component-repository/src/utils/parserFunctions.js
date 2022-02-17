const buildFunctionList = (repoFunctions) => {
  const outFunctions = [];
  for (const [key,value] of Object.entries(repoFunctions)) {

    const pushObj = {
      name: key,
      title: value.title,
      function: value.main,
      description: value.description,
      fields: value.fields,
      schemas: {
        in: value.metadata ? value.metadata.in : undefined,
        out: value.metadata ? value.metadata.out : undefined,
      },
    };
    outFunctions.push(pushObj);
  }

  return outFunctions;
}

module.exports = {
  buildFunctionList,
}