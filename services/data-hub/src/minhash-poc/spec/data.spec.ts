/* eslint-disable @typescript-eslint/explicit-function-return-type */

import chai from "chai"
import Minhash from "../lib/Minhash"
import LshIndex from "../lib/LshIndex"
import getShingles from "../lib/get-shingles"

const should = chai.should()
const assert = chai.assert

describe("identity check", function () {
    describe("LSH Index query", function () {
        it("should return expected members", function () {
            const PERMS = 128
            const SEED = 1
            const SHINGLES = 3
            const BANDSIZE = 7

            const records = {
                u1: {
                    name: "Peter",
                    surename: " Müller",
                    email: "petermueller@basaas.com",
                },
                u2: {
                    name: "Peter",
                    surename: "Meier",
                    email: "petermeier@basaas.com",
                },
                u3: {
                    name: "Müller",
                    surename: "Peter",
                    email: "mpeter@google.com",
                },
                u4: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@basaas.com",
                },
                u5: {
                    name: "P",
                    surename: "Müller",
                    email: "petermueller@basaas.com",
                },
                u6: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@gmail.com",
                },
                u7: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@gail.com",
                },
                u8: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                },
                u9: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                    phone: "+491712312398",
                },
                u10: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                    phone: "+41231771232",
                },
                u11: {
                    name: "Gustavo",
                    surename: "Müller",
                    email: "gustavmueller@foobar.mail",
                    phone: "+4124534534",
                },
                u12: {
                    name: "Gustav",
                    surename: "M",
                    email: "gustavmueller@foobar.mail",
                    phone: "+4124534534",
                },
                u13: {
                    name: "Gustav",
                    surename: "Müller",
                    email: "gustavmueller@foobar.mail",
                    phone: "+4124534534",
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

            const u1Results = ["u1", "u4", "u5", "u6", "u7", "u8"]
            let results = index.query(minhashes["u1"])
            results.should.have.same.members(u1Results)

            results = index.query(minhashes["u4"])
            results.should.have.same.members(u1Results)

            results = index.query(minhashes["u3"])
            results.should.have.same.members(["u3"])

            results = index.query(minhashes["u8"])
            results.should.have.same.members([
                "u10",
                "u9",
                "u1",
                "u4",
                "u5",
                "u6",
                "u7",
                "u8",
            ])

            results = index.query(minhashes["u9"])
            results.should.have.same.members(["u10", "u9", "u8"])

            results = index.query(minhashes["u11"])
            results.should.have.same.members(["u11", "u12", "u13"])
        })

        it("should return expected members", function () {
            const PERMS = 128
            const SEED = 1
            const SHINGLES = 3
            const BANDSIZE = 7

            const records = {
                u1: {
                    name: "Peter",
                    surename: " Müller",
                    email: "petermueller@basaas.com",
                },
                u2: {
                    name: "Peter",
                    surename: "Meier",
                    email: "petermeier@basaas.com",
                },
                u3: {
                    name: "Müller",
                    surename: "Peter",
                    email: "mpeter@google.com",
                },
                u4: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@basaas.com",
                },
                u5: {
                    name: "P",
                    surename: "Müller",
                    email: "petermueller@basaas.com",
                },
                u6: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@gmail.com",
                },
                u7: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@gail.com",
                },
                u8: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                },
                u9: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                    phone: "+491712312398",
                },
                u10: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                    phone: "+493324223342",
                },
                u11: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                    phone: "+493324223342",
                },
                u12: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                    phone: "+493323423442",
                },
                u13: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@foobar.mail",
                    phone: "+493323423442",
                },
                u14: {
                    name: "Heinz",
                    surename: "Müller",
                    email: "heinzmueller@foobar.mail",
                    phone: "+4933242",
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

            const u1Results = ["u1", "u4", "u5", "u6", "u7", "u8"]
            let results = index.query(minhashes["u1"])
            results.should.have.same.members(u1Results)

            results = index.query(minhashes["u4"])
            results.should.have.same.members(u1Results)

            results = index.query(minhashes["u3"])
            results.should.have.same.members(["u3"])

            results = index.query(minhashes["u8"])
            results.should.have.same.members([
                "u10",
                "u11",
                "u12",
                "u13",
                "u9",
                "u1",
                "u4",
                "u5",
                "u6",
                "u7",
                "u8",
            ])

            results = index.query(minhashes["u9"])
            results.should.have.same.members(["u10", "u9", "u8", "u11"])
        })
        it("should return expected members 3", function () {
            const PERMS = 128
            const SEED = 1
            const SHINGLES = 3
            const BANDSIZE = 5

            const records = {
                u1: {
                    name: "Peter",
                    surename: " Müller",
                    email: "petermueller@basaas.com",
                },
                u2: {
                    name: "Heinz",
                    surename: "Müller",
                    email: "heinzmueller@foobar.mail",
                },
                u3: {
                    name: "Peter",
                    surename: "Müller",
                    email: "petermueller@extralongmail.com",
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

            console.log(minhashes["u2"].jaccard(minhashes["u1"]))
            const results = index.query(minhashes["u1"])
            results.should.have.same.members(["u1"])
        })
    })
})
