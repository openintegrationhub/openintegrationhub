import { Client, ApiResponse } from '@elastic/elasticsearch'
import { ContactMapping, ContactValue } from "./mapping"

let index = ""
let client: Client = new Client({ node: "http://localhost:9200" })

export function createClient(url: string): void {
  client = new Client({ node: url })
}

export function setCurrentIndex(_index: string): void {
  index = _index;
}

export async function indexExists(): Promise<ApiResponse> {
  return client.indices.exists({
      index,
  })
}

export async function deleteIndex(): Promise<ApiResponse> {
  console.log("INDEX ",index)
  return client.indices.delete({
    index,
  })
}

export async function createIndex(): Promise<ApiResponse> {
  console.log("INDEX ",index)
  return client.indices.create({
    index,
    body: {},
  })
}

export async function refreshIndex(): Promise<ApiResponse> {
  return client.indices.refresh({ index })
}

export async function putMapping(mapping: ContactMapping): Promise<ApiResponse> {
  return client.indices.putMapping({
    index,
    type: mapping.type,
    include_type_name: true,
    body: {
      properties: {
        ...mapping.value,
      },
    },
  })
}

export async function createContact(value: ContactValue): Promise<ApiResponse> {
  return client.index({
    index,
    body: {
      ...value
    },
  })
}

export async function searchContact(
  tenant: string,
  firstName: string,
  lastName: string,
  email: string
): Promise<ApiResponse> {
  return client.search({
    index,
    body: {
      query: {
        bool: {
          must: [
            {
              match: {
                tenant: {
                  query: tenant,
                },
              },
            },
            {
              dis_max: {
                queries: [
                  {
                    multi_match: {
                      query: firstName,
                      fields: ['firstName'],
                      fuzziness: 1,
                      boost: 1
                    },
                  },
                  {
                    multi_match: {
                      query: lastName,
                      fields: ['lastName'],
                      fuzziness: 1,
                      boost: 1
                    },
                  },
                  {
                    multi_match: {
                      query: email,
                      fields: ['email'],
                      fuzziness: 1,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  })
}

