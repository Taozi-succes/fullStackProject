export interface UserInfoRes {
  id: number
  username: string
  real_name: string
  gender: string
  phone: string
  email: string
  hobby: string
  birthday: string
  idCard: string
  address: string
  avatar: string
  status: number
  role: string
}

export interface LoginRes {
  token: string
}

export interface LoginReq {
  username: string
  password: string
}
