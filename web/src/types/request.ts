// 业务级错误码枚举
export enum BizErrorCode {
  SUCCESS = 0,
  UNAUTHORIZED = 10001,
  FORBIDDEN = 10002,
  PARAM_ERROR = 10003,
  NOT_FOUND = 10004,
  SERVER_ERROR = 10005
}

// 业务级错误码对应消息
export const BizErrorMessage: Record<BizErrorCode, string> = {
  [BizErrorCode.SUCCESS]: '成功',
  [BizErrorCode.UNAUTHORIZED]: '未登录或登录已过期',
  [BizErrorCode.FORBIDDEN]: '没有权限',
  [BizErrorCode.PARAM_ERROR]: '参数错误',
  [BizErrorCode.NOT_FOUND]: '资源不存在',
  [BizErrorCode.SERVER_ERROR]: '服务器内部错误'
};

// 常见 HTTP 错误码对应消息
export const HttpErrorMessage: Record<number, string> = {
  400: '请求参数错误',
  401: '未授权，请重新登录',
  403: '拒绝访问',
  404: '请求地址不存在',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务不可用',
  504: '网关超时'
};