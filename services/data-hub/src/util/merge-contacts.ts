import { merge } from "lodash";
import Minhash from "../minhash/lib/Minhash"
import getShingles from "../minhash/lib/get-shingles"

const PERMS = 256 // number of permutations for minhash
const SEED = 1 // minhash random seed
const SHINGLES = 3 // shingles length

export function mergeArray(newArray, existingArray): [] {
    const newEntries = []
    for (const entry of existingArray) {
      const existingEntryMinhash = new Minhash({ numPerm: PERMS, seed: SEED })
      // @ts-ignore
      getShingles([
        ...Object.keys(entry),
        ...Object.values(entry)
      ], SHINGLES).forEach((shingle) => existingEntryMinhash.update(shingle))
      for (const newEntry of newArray) {
        const newEntryMinhash = new Minhash({ numPerm: PERMS, seed: SEED })
        // @ts-ignore
        getShingles([
          ...Object.keys(newEntry),
          ...Object.values(newEntry)
        ], SHINGLES).forEach((shingle) => newEntryMinhash.update(shingle))

        if (newEntryMinhash.jaccard(existingEntryMinhash) < 0.85) {
          // @ts-ignore
          newEntries.push(newEntry)
        }
      }
    }
    return existingArray.concat(newEntries)
  }


export default (newContent, existingContent): [] => {
    const newContactData = newContent.contactData ? [ ...newContent.contactData ] : []
    const newAddresses = newContent.addresses ? [ ...newContent.addresses ] : []

    delete newContent.contactData
    delete newContent.addresses

    return {
      // shallow merge properties
      ...merge(newContent, existingContent),
      // merge contact data
      contactData: mergeArray(newContactData, existingContent.contactData || []),
      // merge addresses
      addresses: mergeArray(newAddresses, existingContent.addresses || [])
    }
  }
