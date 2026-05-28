// [유틸리티 함수들]

export const blockInvalidChar = (e) => {
  if (['-', 'e', 'E', '+'].includes(e.key)) {
    e.preventDefault();
  }
};

// 핵심 유틸리티: 수요일 기준 한국식 주차 계산
export const getCustomWeekInfo = (dateString) => {
  const [y, m, d] = dateString.split('-');
  const date = new Date(y, m - 1, d);
  
  const wednesday = new Date(date);
  wednesday.setDate(date.getDate() - date.getDay() + 3);
  
  const mappedYear = wednesday.getFullYear();
  const mappedMonth = wednesday.getMonth();
  
  const firstDayOfMonth = new Date(mappedYear, mappedMonth, 1);
  const firstWed = new Date(firstDayOfMonth);
  firstWed.setDate(1 - firstDayOfMonth.getDay() + 3);
  
  if (firstWed.getMonth() !== mappedMonth) {
    firstWed.setDate(firstWed.getDate() + 7);
  }
  
  const diffTime = wednesday.getTime() - firstWed.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(diffDays / 7) + 1;

  return { year: mappedYear, month: mappedMonth + 1, week: weekNum };
};

export const getDayOfWeek = (dateString) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(dateString).getDay()];
};