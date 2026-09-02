export function canEmployeeSeeProject(userId: string, memberIds: string[]) {
  return memberIds.includes(userId);
}
