
---

**Creator:** Philipp Hoegner ([philecs](https://github.com/philecs)), Cloud Ecosystem e.V. <br>
**Last revised by:** -  <br>
**Last update:** 19-02-2019<br>
**Version:** 0.2<br>

---

# Introduction

This document is designed to list possible data synchronization conflicts and possible solution strategies.

- [Introduction](#introduction)
  - [Conficts](#conficts)
    - [Simultaneous Changes in differnt Systems](#simultaneous-changes-in-differnt-systems)
      - [Solution Strategies Simultaneous Changes](#solution-strategies-simultaneous-changes)
    - [Changes on a dataset that does not exist](#changes-on-a-dataset-that-does-not-exist)
      - [Solution Strategies Changes on non-existent dataset](#solution-strategies-changes-on-non-existent-dataset)
    - [Circular Updates](#circular-updates)
  - [Solution Strategies Circular Updates](#solution-strategies-circular-updates)

## Conficts

### Simultaneous Changes in differnt Systems

**Problem**:

- Two systems change a specific value of a given dataset at the same time
  - In this case `same time` can also mean inbetween two flow executions (polling flow)

**Example:**

_Original Dataset:_

|firstName|lastName|Phone|Company|
|---|---|---|---|
|John|Doe|+12 345 678|Alpha Company|

1. System A changes `company` to `beta company`
2. System B changes `company` to `delta company`
3. System A changes `phone` to `+98 765 432 1`
4. System B changes `lastName` to `Foo`

Changes 3 & 4 only changes values in one of the system, so there is no conflict.

Canges 1 & 2 are changes on the same value of the dataset. The subsequent question is:

_Which dataset should be stored?_

#### Solution Strategies Simultaneous Changes

1. First-Writer-Wins: The first change is propagated. `First` can be determined in different ways e.g. by comparing _lastChanged_ timestamps (granulartity of timestamps must be considered) or taking the dataset that is first propagated to the hub
2. Last-Writer-Wins: The last change is propagated. `Last` can be determined in different ways e.g. by comparing _lastChanged_ timestamps (granulartity of timestamps must be considered)  or taking the dataset that is last propagated to the hub.
3. One of the systems is declared to be the `master`. Thus, the `master` systems record is propagated.
4. Manual Intervention: Operations stuff has to resolve the conflict.
5. Logging Conflicts: Conflicts can be qirten on a queue (Some sort of resolution software could attempt to resolve the conflicts automatically. For conflicts that couldn't be resolved option **4** could be used).

---

### Changes on a dataset that does not exist

**Problem:**

- System A deletes a certain dataset but is not able to propagate the deletion due to missing mechanisms.
- System B updates this certain dataset and propagates the dataset via the OIH. When the command to update the record is run on system A, there’s a conflict. The command intstructs system A to change a non-existent dataset.

#### Solution Strategies Changes on non-existent dataset

- Tbd

---

### Circular Updates

**Problem:**

1. User changes a value of dataset X in system A
2. Connector of system A fetches new and updated data on the basis of a last modified timestamp
3. Dataset X is propagated via the OIH to other (listening) services (For this example for reasons of simplicity only to system B)
4. Dataset X is updated in System B and last modified in system B is updated
5. Connector of system B fetches new and updated data n the basis of a last modified timestamp
6. Dataset X is propagated via the OIH to other (listening) services (This list includes A)
7. **Start again with step 1**
8. ...

These circular updates lead to a loop. The subsequent question is:

_How to prevent such loops? _

## Solution Strategies Circular Updates

- Central last modified timestamp within the OIH which compares the last modified timestamp of system B with OIH last timestamp (depending on timestamp granularity the timestamps could differ and loop still occurs)
- Additionally store a value for `last modified by` to prevent OIH updates to be propagated multiple times (e.g. _if lastModified equals OIh, ignore the change_)
  - Disadvantage: Changes made by an end user in the target system are not recognized in certain cases e.g. end user updates dataset X (lastModified and modifier updated) --> OIH sends update for dataset X (lastModified and modifier updated) --> connectors polls for new and updated data.
- Implement a sync flag for changes made by an end-user. This ensures that changes by an end-user are not overwritten. Polling trigger could fetch for lastModified and syncFlag === true.
  - Requires the target system to implement a syncFlac column
  - Requires the target systems API to provide a filter for syncFlag field#

---