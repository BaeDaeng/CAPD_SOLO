export const PASSWORD_GUIDE = '영문 대소문자, 숫자, 특수문자를 포함하여 8~20자로 입력해 주세요.';
export const PASSWORD_VALID_MESSAGE = '사용 가능한 비밀번호입니다.';
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,20}$/;

export const isValidPassword = (password) => PASSWORD_PATTERN.test(password);

export const getPasswordFeedback = (password) => {
  if (!password) return null;

  return isValidPassword(password)
    ? { type: 'success', message: PASSWORD_VALID_MESSAGE }
    : { type: 'error', message: PASSWORD_GUIDE };
};
