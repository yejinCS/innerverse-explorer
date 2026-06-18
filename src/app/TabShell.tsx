// 하단 탭바가 있는 메인 화면들(홈/목록/리뷰/나) 공통 셸.
import { Outlet } from "react-router-dom";
import { TabBar } from "./ui/layout";

export function TabShell() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}
