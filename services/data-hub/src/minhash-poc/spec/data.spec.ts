/* eslint-disable @typescript-eslint/explicit-function-return-type */

import chai from "chai"
import Minhash from "../lib/Minhash"
import LshIndex from "../lib/LshIndex"
import getShingles from "../lib/get-shingles"

const should = chai.should()
const assert = chai.assert

describe("identity check", function () {
  xdescribe("test", () => {
    const PERMS = 512
    const SEED = 1
    const minhash1 = new Minhash({ numPerm: PERMS, seed: SEED })
    minhash1.update("test")

    // const minhash2 = new Minhash({ numPerm: PERMS, seed: SEED })
    // minhash2.update("test")
  })

  describe("LSH Index query", function () {
    it("should return expected members", function () {
      // const PERMS = 128
      // const SEED = 1
      // const SHINGLES = 3
      // const BANDSIZE = 7

      const PERMS = 128
      const SEED = 1
      const SHINGLES = 3
      const BANDSIZE = 7

      const records = {
        u1: {
          name: "Hans C",
          surename: " Eggert",
          email: "hansceggert@basaas.com",
        },
        u2: {
          name: "Hans",
          surename: "Eggert",
          email: "hegge@google.com",
        },
        u3: {
          name: "Herbert",
          surename: "Eggert",
          email: "heggert@google.com",
        },
        u4: {
          name: "Peter",
          surename: "Eggert",
          email: "peggert@google.com",
        },
        u5: {
          name: "Herbi",
          surename: "Eggert",
          email: "heggert@google.com",
        },
        u6: {
          name: "Peter Gustav",
          surename: "Eggert",
          email: "peggert@google.com",
        },
        u7: {
          name: "Peter G",
          surename: "Eggert",
          email: "petergeggert@google.com",
        },
        u8: {
          name: "Peter",
          surename: "Müller",
          email: "peterMueller@google.com",
        },
        u9: {
          name: "Peter",
          surename: "Mülla",
          email: "peterMuella@google.com",
        },
        u10: {
          name: "Peter",
          surename: "Müll",
          email: "peterMuell@google.com",
        },
        u11: {
          name: "Peter",
          surename: "Müller",
          phone: "+49 30 4458372",
        },
      }

      const minhashes = {}
      const index = new LshIndex({ bandSize: BANDSIZE })

      for (const [key, record] of Object.entries(records)) {
        const minhash = new Minhash({ numPerm: PERMS, seed: SEED })
        getShingles(Object.values(record), SHINGLES).forEach((shingle) =>
          minhash.update(shingle)
        )

        index.insert(key, minhash)
        minhashes[key] = minhash
      }

      const results = index.query(minhashes["u1"])
      // results.should.have.same.members(["u1", "u2"])

      // results = index.query(minhashes["u3"])
      // results.should.have.same.members(["u3", "u5"])

      // results = index.query(minhashes["u4"])
      // results.should.have.same.members(["u4", "u6", "u7"])

      // results = index.query(minhashes["u5"])
      // results.should.have.same.members(["u3", "u5"])

      // results = index.query(minhashes["u6"])
      // results.should.have.same.members(["u4", "u6", "u7"])

      // results = index.query(minhashes["u7"])
      // results.should.have.same.members(["u7", "u6", "u4"])

      // results = index.query(minhashes["u7"])
      console.log(results)
      // results = index.query(minhashes["u8"])
      // console.log(results)
      // console.log(minhashes["u7"].jaccard(minhashes["u4"]))
      // console.log(minhashes["u7"].jaccard(minhashes["u6"]))
      // console.log(minhashes["u7"].jaccard(minhashes["u8"]))
      // console.log(minhashes["u7"].hashValues)
    })
  })
})
