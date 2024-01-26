export default class ApiResponse<T> {
  constructor(
    public error: boolean,
    public data?: T,
  ) {}
}
