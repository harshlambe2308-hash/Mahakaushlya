'use strict';

/**
 * ApiResponse — standardizes every successful HTTP response into the unified
 * MahaKaushalya envelope: { success: true, data: any, message: string }
 */
class ApiResponse {
  static ok(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      message,
    });
  }

  static created(res, data = null, message = 'Created successfully') {
    return ApiResponse.ok(res, data, message, 201);
  }
}

module.exports = ApiResponse;
