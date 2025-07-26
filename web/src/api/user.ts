import request from '@/utils/request';
import type { UserInfoRes,LoginRes,LoginReq } from '@/types/user';

export function getUserInfo() {
  return request<UserInfoRes>({
    url: '/user/info',
    method: 'get'
  });
}

export function login(data: LoginReq) {
  return request<LoginRes>({
    url: '/user/login',
    method: 'post',
    data
  });
}