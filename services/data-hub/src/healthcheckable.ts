export default interface Healthcheckable {
    healthcheck(): Promise<void>;
}
