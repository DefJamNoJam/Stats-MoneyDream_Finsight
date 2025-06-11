# Finsight 프로젝트

### 개인화된 투자 분석 플랫폼<br/>

"데이터 위에, 당신의 판단을 더하다."
<br/>
<br/>

## Github Upload Procedure
1. create (if not already created) a branch with appropriate branch name (eg. feat/crawling/naver)
    ```bash
    git checkout -b branch_name
    ```

   - If the branch is already created, simply do
       ```bash
       git checkout branch_name
       ```

    - 수정된 파일들 리스트 보고싶을 때
        ```bash
        git status 
        ```


   - 수정된 파일 중 어떤 부분을 바꿨는지 보고싶을 때
       ```bash
       git diff 
       ```

<br/>

2. add modified files that needs to be pushed (수정된 파일 전부)
    ```bash
    git add .
    ```
   - 특정 파일만 선택해서 올리고 싶을 경우 
        ```bash
        git add 파일명
        ```

<br/>

3. commit changes with appropriate commit message
    ```bash
    git commit -m '[#(issue_ID)] COMMIT_TYPE: COMMIT_SUMMARY ([related MR_ID])'
    ```

<br/>

4. push the commit to local branch
    ```bash
    git push origin branch_name
    ```

5. Go to github repository and click on 'Compare & Pull Request'
6. compare and Merge. Delete the branch after merged
7. Delete the branch in local repository
    ```bash
    git checkout main
    git branch -D branch_name
    ```

<br>

## Github Ground Rules
1. Create Issue for the current task that you are working on
2. Notify teammates after pull requests
3. **Never** push anything or work on main branch


<br>

## ETC
1. react 실행
   - MoneyDream 폴더로 이동 후 terminal에 명령어 실행
        ```bash
        npm start
        ```

2. database 실행
   - MoneyDream/backend 폴더로 이동 후 새로운 terminal에 명령어 실행
        ```bash
        uvicorn main:app --reload
        ```