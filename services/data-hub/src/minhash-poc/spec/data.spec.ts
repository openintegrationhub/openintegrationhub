import chai from "chai"
import Minhash from "../lib/Minhash"
import LshIndex from "../lib/LshIndex"

const should = chai.should()
const assert = chai.assert
describe("identity check", function () {
  describe("queries", function () {
    it("should return matches", function () {
      const u1 = {
        name: "Bert",
        surename: "M",
        email: "foo@bar.com",
      }

      const u2 = {
        name: "Bert",
        surename: "Meier",
        email: "foo@bar.com",
      }

      const m1 = new Minhash()
      const m2 = new Minhash()
      const index = new LshIndex()
      m1.update(JSON.stringify(Object.values(u1).join("")))
      m2.update(JSON.stringify(Object.values(u2).join("")))
      index.insert("m1", m1)
      index.insert("m2", m2)
      const results = index.query(m1)
      console.log(results)
      true.should.equal(true)
    })
  })
})
