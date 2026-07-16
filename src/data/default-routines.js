function defaultOffToday() {
      return { outing: true };
    }

function routinesForDisplay() {
      const byId = new Map(state.routines.map((routine) => [routine.id, routine]));
      const ordered = DISPLAY_ROUTINE_ORDER.map((id) => byId.get(id)).filter(Boolean);
      state.routines.forEach((routine) => {
        if (!DISPLAY_ROUTINE_ORDER.includes(routine.id)) ordered.push(routine);
      });
      return ordered;
    }

const DEFAULT_ROUTINES = [
      {
        id: "morning",
        icon: "↗",
        name: "아침 출근",
        color: "#C85A4A",
        soft: "#F3DDD9",
        doneText: "독서실 도착. 이제 첫 Step만 열면 된다.",
        steps: [
          { id: "m1", icon: "🚽", title: "화장실 가기", note: "", minutes: 3 },
          { id: "m2", icon: "🙆", title: "목·어깨 풀기 2세트", note: "턱 당기기 8회 │ 고개 숙이지 말고 턱만 뒤로\n어깨 돌리기 10회 │ 팔꿈치로 큰 원 그리기\n가슴 열기 20초 │ 손을 등 뒤로 잡고 천천히 펴기", minutes: 4 },
          { id: "m3", icon: "🍚", title: "아침 먹기", note: "", minutes: 20 },
          { id: "m4", icon: "🚶", title: "집 안 걷기", note: "", minutes: 5 },
          { id: "m5", icon: "🚿", title: "씻기", note: "", minutes: 8 },
          { id: "m6", icon: "👕", title: "옷 입기", note: "양말까지", minutes: 3 },
          { id: "m7", icon: "🎒", title: "가방 열기", note: "물, 충전기, 자료, 필기구", minutes: 3 },
          { id: "m8", icon: "🚪", title: "문 앞 보기", note: "폰, 지갑, 키, 이어폰", minutes: 1 },
          { id: "m9", icon: "🚶", title: "독서실 가기", note: "", minutes: 8 }
        ]
      },
      {
        id: "lunch",
        icon: "☀️",
        name: "점심 루틴",
        color: "#A6A43A",
        soft: "#EEF0CF",
        doneText: "복귀 완료. Step부터 열자.",
        steps: [
          { id: "l1", icon: "🧍", title: "일어나기", note: "자리 정리", minutes: 1 },
          { id: "l2", icon: "🏠", title: "집 가기", note: "", minutes: 8 },
          { id: "l8", icon: "🏋️", title: "하체 3세트", note: "스쿼트 10~15회 │ 엉덩이 뒤로, 허벅지 수평\n엉덩이 들기 10~15회 │ 엉덩이 조이며 들어 올리기\n런지 좌우 8~12회 │ 뒷무릎 바닥 가까이\n월싯 30~45초 │ 등·허리 벽에 붙이기", minutes: 10 },
          { id: "l3", icon: "🍚", title: "점심 먹기", note: "", minutes: 25 },
          { id: "l4", icon: "💧", title: "물 마시기", note: "", minutes: 1 },
          { id: "l5", icon: "🚽", title: "화장실 가기", note: "", minutes: 3 },
          { id: "l9", icon: "🙆", title: "가슴 펴기", note: "문틀 가슴 늘리기 좌우 30초 │ 팔을 걸고 몸을 반대로 돌리기\n어깨 돌리기 10회 │ 팔꿈치로 큰 원 그리기\n상체 비틀기 좌우 8회 │ 골반은 두고 가슴만 천천히", minutes: 2 },
          { id: "l6", icon: "🚶", title: "걸어서 복귀", note: "", minutes: 15 },
          { id: "l7", icon: "▶", title: "Step 열기", note: "방금 하던 것", minutes: 1 }
        ]
      },
      {
        id: "dinner",
        icon: "🌆",
        name: "저녁 루틴",
        color: "#2389C7",
        soft: "#DCEFFA",
        doneText: "복귀 완료. Step부터 열자.",
        steps: [
          { id: "d1", icon: "🧍", title: "일어나기", note: "자리 정리", minutes: 1 },
          { id: "d2", icon: "🏠", title: "집 가기", note: "", minutes: 8 },
          { id: "d8", icon: "💪", title: "상체·코어 3세트", note: "턱걸이 2~3회 │ 반동 없이 턱을 바 위로\n데드버그 좌우 8~12회 │ 허리 바닥에 붙이기\n푸시업 8~15회 │ 가슴 바닥 가까이\n플랭크 20~40초 │ 머리부터 발끝 일자", minutes: 10 },
          { id: "d3", icon: "🍚", title: "저녁 먹기", note: "", minutes: 30 },
          { id: "d4", icon: "💧", title: "물 마시기", note: "", minutes: 1 },
          { id: "d5", icon: "🚽", title: "화장실 가기", note: "", minutes: 3 },
          { id: "d9", icon: "🧍", title: "등·허리 풀기", note: "벽 짚고 등 늘리기 40초 │ 엉덩이 뒤로, 팔과 등 길게\n상체 비틀기 좌우 8회 │ 골반은 두고 가슴만 천천히\n옆구리 늘리기 좌우 30초 │ 한 팔 올리고 옆으로 기울이기", minutes: 3 },
          { id: "d6", icon: "🚶", title: "걸어서 복귀", note: "", minutes: 15 },
          { id: "d7", icon: "▶", title: "Step 열기", note: "오늘 남은 것", minutes: 1 }
        ]
      },
      {
        id: "outing",
        icon: "🧭",
        name: "외출 준비",
        color: "#D88A2A",
        soft: "#F4E5CC",
        doneText: "외출 준비 완료. 출발하자.",
        steps: [
          { id: "o1", icon: "📶", title: "와이파이 끄기", note: "", minutes: 0.5 },
          { id: "o2", icon: "🗺", title: "지도 보기", note: "도착 시간 보기", minutes: 2.5 },
          { id: "o3", icon: "⏰", title: "출발 적기", note: "", minutes: 1, capture: "departure" },
          { id: "o4", icon: "👕", title: "옷 꺼내기", note: "바지 - (신발) - 아우터 - 상의\n+속옷, 양말", minutes: 4 },
          { id: "o5", icon: "🔌", title: "충전 꽂기", note: "폰, 보조배터리, 이어폰", minutes: 1 },
          { id: "o6", icon: "🚿", title: "샤워하기", note: "", minutes: 25 },
          { id: "o7", icon: "🪒", title: "면도하기", note: "", minutes: 3 },
          { id: "o8", icon: "🧴", title: "로션 바르기", note: "립밤까지", minutes: 2 },
          { id: "o9", icon: "🧥", title: "옷 입기", note: "", minutes: 3 },
          { id: "o10", icon: "🎒", title: "가방 열기", note: "어제 안 챙긴 음식, 전자기기\n\n물, 지갑, 충전기, 우양산, 칫솔, 파우치", minutes: 4 },
          { id: "o11", icon: "🪞", title: "거울 보기", note: "얼굴, 머리, 옷", minutes: 1 },
          { id: "o12", icon: "👟", title: "신발 신기", note: "가방 메기", minutes: 2 },
          { id: "o13", icon: "🚪", title: "나가기", note: "시간 확인", minutes: 1 }
        ]
      },
      {
        id: "night",
        icon: "↓",
        name: "밤 종료",
        color: "#934B8F",
        soft: "#F2E0EC",
        doneText: "오늘은 닫았다. 폰 없이 침대에 들어가자.",
        steps: [
          { id: "n1", icon: "📒", title: "DayLog 열기", note: NIGHT_DAYLOG_NOTE, minutes: 12 },
          { id: "n2", icon: "✍️", title: "일기 쓰기", note: "3줄만", minutes: 3 },
          { id: "n3", icon: "💌", title: "연락하기", note: "썸원도 쓰기", minutes: 15 },
          { id: "n5", icon: "🧩", title: "첫 Step 정하기", note: "내일 할 일 시작부분 하나만 정하기", minutes: 4 },
          { id: "n6", icon: "🎒", title: "준비물 챙기기", note: "음식, 전자기기 제외\n물, 지갑, 충전기, 우양산, 칫솔, 파우치", minutes: 5 },
          { id: "n7", icon: "🔌", title: "폰 충전 꽂기", note: "침대 밖", minutes: 1 },
          { id: "n13", icon: "🧘", title: "전신 스트레칭", note: "고양이 자세 8회 │ 네발로 엎드려 등을 둥글게 말았다가 천천히 펴기\n누워서 허리 비틀기 좌우 40초 │ 무릎 세우고 한쪽으로 넘기기, 반대쪽 어깨는 바닥\n허벅지 뒤 늘리기 좌우 40초 │ 누워서 한쪽 다리 들고 허벅지 뒤를 잡아 몸 쪽으로 당기기", minutes: 8 },
          { id: "n8", icon: "🫧", title: "세수하기", note: "", minutes: 2 },
          { id: "n9", icon: "🪥", title: "양치하기", note: "", minutes: 3 },
          { id: "n10", icon: "🧴", title: "로션 바르기", note: "립밤까지", minutes: 1 },
          { id: "n11", icon: "🌙", title: "불 끄기", note: "", minutes: 0.5 },
          { id: "n12", icon: "🛏", title: "침대 눕기", note: "폰 없이", minutes: 0.5 }
        ]
      }
    ];
