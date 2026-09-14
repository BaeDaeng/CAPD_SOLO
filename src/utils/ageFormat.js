export const formatAge = (age) => {
  if (age === undefined || age === null || age === '') return '-';
  return `만 ${age}세`;
};
