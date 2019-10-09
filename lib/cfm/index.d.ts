/// <reference types="node" />

export class CFM {
    public resolve(incoming: object, target: object): object;
    public setRules(rules: object): void;
    public setDefaultRules(rules: object): void;
    public setGlobalRules(rules: object): void;
    public addCustomRule(name: string, resolvers: string[]): void;
    public addCustomResolver(name: string, resolver: Function): void
}
