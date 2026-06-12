# 30분 172일 말씀동행

하루 30분씩 172일 동안 공동체 성경읽기 여정을 개인 속도에 맞게 이어가도록 돕는 웹앱입니다.

이 앱은 경쟁이나 출석 관리를 목적으로 하지 않습니다. 각자가 자신의 다음 회차를 이어가고, 개인 묵상 메모를 남기는 데 초점을 둡니다.

## 주요 기능

- Day 1-172 회차표
- YouTube 재생목록 기반 영상 플레이어
- Day와 재생목록 순서 매칭
- 시편, 구약, 신약, 시편 읽기 범위 메모
- 완료 체크와 개인 묵상 메모

## 저작권 원칙

- 성경 본문 전문은 앱에 저장하거나 표시하지 않습니다.
- 영상은 YouTube 재생목록을 임베드/API 방식으로 연결합니다.
- 읽기 범위, 개인 메모, 진행 기록만 다룹니다.

## 개발 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## GitHub Pages 배포

이 프로젝트는 GitHub Pages의 `main /docs` 배포 방식으로 사용할 수 있습니다.

1. GitHub에서 새 저장소를 만듭니다.
2. 이 프로젝트를 저장소에 push합니다.
3. GitHub 저장소의 `Settings > Pages`에서 `Source`를 `Deploy from a branch`로 선택합니다.
4. Branch는 `main`, folder는 `/docs`로 선택합니다.

GitHub Pages 주소는 보통 다음 형태입니다.

```text
https://USER_NAME.github.io/REPOSITORY_NAME/
```
