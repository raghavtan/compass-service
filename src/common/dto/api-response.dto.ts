export class ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;

  constructor(statusCode: number, message: string, success: boolean, data?: T) {
    this.statusCode = statusCode;
    this.message = message;
    if (data !== undefined) {
      this.data = data;
    }
  }

  static success<T>(
    statusCode: number,
    message: string,
    data?: T,
  ): ApiResponse<T> {
    return new ApiResponse(statusCode, message, true, data);
  }

  static error(statusCode: number, message: string): ApiResponse<null> {
    return new ApiResponse(statusCode, message, false);
  }
}
