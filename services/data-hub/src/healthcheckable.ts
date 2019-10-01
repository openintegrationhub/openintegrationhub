export default interface IHealthcheckable {
    healthcheck(): Promise<void>;
}
