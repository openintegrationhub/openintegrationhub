# Smart Process Assistance

The main aim of Smart Process Assistance (SPA) is to recommend suitable flows for tenants based on existing data, such as connectors used, flow structure, data stored in data hub, etc.

This document describes concepts which could be used in OIH, provided that sufficient data is available. The concepts may vary from simple pattern matching and statistical analysis to more complex approaches like machine learning.

### Operation Types

Currently, a flow node references and component and the function (action/trigger) used. There is currently no mandatory schema definition of what input/output models are used for a component function.

Individual flow steps could contain meta information such as what type of operation it is and not just what component. To be precise, this information would be stored in the component repository for each individual trigger and action. A predefined dictionary of possible **Operation Types** could be: *sendMail*, *createTodo*, *onMailReceived*, *sendNotification*, etc. Different connectors could support similar operations. When using a standardized data model, which the OIH provides via Metadata repository, components could be easily interchangeable from a BPMN perspective, as long as they supported the same operation and thus provide for an input A always an output A'.
A process containing a *createTodo*-step could be implemented with different connectors that support creating a todo. A recommendation engine would only need to know which action or process needs to be accomplished and return a list of flow templates that match the requirements. This result list could be flexible to be used with different connectors or even filtered, when provided with a list of preferred connectors.

### Data Models

Using a standardized data model in combination with data storage in Data hub would also allow to further match flow templates to existing data. For example, if the tenant stores large amounts of contact data and the input/output data models of components are known, we can create a list of flows matching the criteria.

### Connectors and apps

Recommendations can be made solely based on app/connector matching, e.g. if a company uses Microsoft and Pipedrive, we can suggest flows where these two apps occur (or these apps form a subset of the flow). In case of simple/lightweight applications, this approach may be sufficient for most cases, e.g. synchronizing data between two calendar or contacts applications.


### Comparability of flows and their permutations

One major challenge with flows is that they are directed graphs. When creating a recommendation list, we want to create a weighted (or scoring based) list of candidates and provide a short list of best matches.

Finding graph similarity (also sometime referenced as [network alignment](https://www.sciencedirect.com/science/article/abs/pii/S0957417419305937) or [graph matching](https://en.wikipedia.org/wiki/Graph_matching)) is a known problem and various techniques already exist, such as [neighbour matching](https://en.wikipedia.org/wiki/Neighbourhood_(graph_theory)).

Determining "most used" or popular flows is not a straightforward task with OIH flows. Given a characteristic "a flow containing calendar synchronization between Microsoft Outlook and Google Calendar" can match to a large set of flows, where these two solutions are a subset. In more complex flows, we can have different graph structures, e.g. due to branching. Users also could have copied a flow template and heavily modified it or created their flows from scratch. This means, the recommendation system needs to "understand" the flow structure (which connectors are used, how is the interconnection of nodes, which node/connector methods are used, etc.).

In case of OIH Flows, we could achieve viable results either with a curated list of flows (which are created by an admin) or have an "intelligent" system, which auto-adjusts the recommendation list with each new flow created or started (actually used by tenants).

A simple curated list could have distinct flows (a single version) for specific combination of connectors. For example, there would be only one flow to sync data between Microsoft Outlook and Google Contacts. Tracking how often a flow template is used (copied or extended) would allow to generate simple statistics and use these to recommend "most used" flows in combination with operation types/connectors/data models present in those flows.

As described above, sophisticated solution would be required if the OIH we're to recommend flows based solely on existing flows and the flow structure (e.g. components and operation types used in a flow). For example, normalizing the flows and determining the data flow direction and the order of connectors in a simplified graph.


### ML approaches

We will focus on few wide-spread approaches used for ML based recommendation engine in this document. This is not an exhaustive list as such detailed analysis would be entirely out of scope of this document.

The essential blocks for this approach are:
* Retrieval: we want to create a small subset of candidates from our large set of flows. Normalizing and grouping of flows candidates.
* Scoring: Some sort of scoring in order to compare individual flows
* Re-Ranking: Re-rank the candidates considering different factors. We also want to avoid having a monotonous result list.

#### Candidate generation [[1](http://www.inf.unibz.it/~ricci/papers/intro-rec-sys-handbook.pdf)]

There are two common candidate generation methods:

* Content-based filtering
* Collaborative filtering

**Content-based filtering** recommends flows based on similarity of flows. This technique is useful when recommending content elements, such as video, images, e.g. watching a YouTube video about programming and seeing recommendations for other programming videos. With flows, a use case could be searching for flows "CRM" or "Pipedrive CRM" specific flows and receiving a list of all flows containing CRM nodes or moe specifically Pipedrive.

With **Collaborative filtering** we can also consider similarity between tenants or users, e.g. Tenants that use flows containing "Google Contacts" also have flows containing "Microsoft Outlook". If a similarity between two tenants is detected, we can apply this recommendation technique which allows tenants to get new inspirations without knowing upfront what exactly they are searching for.  
