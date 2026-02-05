export class ResData<T> {
  message: string;
  statusCode: number;
  data?: T | null;
  error?: Error | null;
  metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    data?: T | null,
    error?: Error | null,
    metadata?: Record<string, any>,
  ) {
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
    this.error = error;
    this.metadata = metadata;
  }
}
