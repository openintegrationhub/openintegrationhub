## Import & Merge

### Initial situation

The initial import of existing data from different sources poses some problems. The focus of this concept is the determination of same identities for data sets from different sources. As an example, it should be shown here through the context of “contact details”.

If you look at the schema for specific data records from one source and compare it with the schema of another, you can already see differences in essential fields such as "forename" and "name" or "lastname" and "surename".

Furthermore, the redundant storage of data sets - possibly maintained independently by hand - can cause orthographic errors, which in turn lead to different values. Incorrect fields may also have been selected for entering a value.

While the different assignment of field names can be solved by individually mapping known structures to a uniform data format, a solution for the second sub-problem is somewhat more difficult.

### MinHash to determine common identity

A possible solution can be given by using the so-called "MinHash" procedure (Broder 1997). See https://web.archive.org/web/20150131043133/http://gatekeeper.dec.com/ftp/pub/dec/SRC/publications/broder/positano-final-wpnums.pdf

By standardizing the data and comparing individual values ​​at random, the probability of a common identity of two different data sets can be determined. Based on this probability, the affected data sets can be combined automatically if necessary.

### Objectives of a prototype

So that the effectiveness of the "MinHash" procedure can be tested, Data Hub Service is expanded to include a specific import interface and the algorithm is incorporated in the form of a JS implementation.
See https://github.com/duhaime/minhash

After a basic implementation is done, this functionality should be challenged on the basis of various data sets and optimized in a further step so that “false positives” only occur to a minimal extent when determining the identity.

### Proof of concept

An initial implementation of the algorithms can be found at services/data-hub/src/minhash-poc/lib.

We have used https://github.com/duhaime/minhash as a starting point and rewritten it in Data-Hub compatible typescript language. The correct functioning of the new library can be checked using the ported tests.

Then different data sets were checked for the existence of a common identity. The result of this initial check can be summarized as follows:

The "minhashing" of small data sets basically works here and is suitable for establishing the same identities in different data sets.

In contrast to the conventional application of these algorithms, the OIH's context tends to handle tiny-sized data sets. Each set usually contains a small number of characters and therefore results more often in a meager set of shingles. In the end, this can lead to a higher amount of false positives.

One possible conclusion is that automatic detection using the Minhash method should not be accepted without a further verification process. This should be done by algorithmic post-processing or plain human interaction on a suited merge interface.