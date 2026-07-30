(function(){
  let armedStepDeleteId=null;
  let armedStepDeleteTimer=null;

  function currentDeleteButton(){
    if(!armedStepDeleteId)return null;
    const routine=getRoutine(editRoutineId);
    if(!routine)return null;
    const index=routine.steps.findIndex((step)=>step.id===armedStepDeleteId);
    if(index<0)return null;
    return els.stepEditorList.querySelector(`button[data-action="step-delete"][data-index="${index}"]`);
  }

  function renderArmedButton(){
    const button=currentDeleteButton();
    if(!button)return;
    button.classList.add("confirm");
    button.textContent="한 번 더";
    button.setAttribute("aria-label","한 번 더 누르면 이 단계를 삭제");
  }

  function clearArm(){
    if(armedStepDeleteTimer)window.clearTimeout(armedStepDeleteTimer);
    armedStepDeleteTimer=null;
    const button=currentDeleteButton();
    if(button){
      button.classList.remove("confirm");
      button.textContent="삭제";
      button.setAttribute("aria-label","단계 삭제");
    }
    armedStepDeleteId=null;
  }

  function arm(stepId){
    clearArm();
    armedStepDeleteId=stepId;
    renderArmedButton();
    showToast("한 번 더 누르면 삭제");
    armedStepDeleteTimer=window.setTimeout(clearArm,4200);
  }

  function deleteStepSafely(index){
    const routine=getRoutine(editRoutineId);
    if(!routine||!routine.steps[index])return;
    if(routine.steps.length<=1){clearArm();showToast("마지막 단계는 삭제 불가");return}
    const step=routine.steps[index];
    if(armedStepDeleteId!==step.id){arm(step.id);return}

    const before=clone(state);
    clearArm();
    if(!window.RoutinerDataSafety?.checkpointCurrent("step-delete",true)){
      showToast("복구본을 남기지 못해 삭제를 중단했어");
      return;
    }
    window.RoutinerSyncV2?.markOperation("step-delete");
    const removed=routine.steps.splice(index,1)[0];
    if(editStepId===removed.id)editStepId=null;
    normalizeSessionAfterRoutineEdit(routine.id);
    saveState();
    if(!window.RoutinerDataSafety?.isSafe()){
      state=before;
      renderEditor();
      showToast("저장 실패로 삭제를 되돌렸어");
      return;
    }
    renderEditor();
    if(activeRoutineId===routine.id)renderRun();
    showToast("단계 삭제됨");
  }

  els.stepEditorList.addEventListener("click",(event)=>{
    const button=event.target.closest("button");
    if(!button)return;
    if(button.dataset.action!=="step-delete"){
      clearArm();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const index=Number(button.dataset.index);
    if(Number.isInteger(index))deleteStepSafely(index);
  },true);

  window.addEventListener("keydown",(event)=>{
    if(event.key==="Escape")clearArm();
  });

  window.RoutinerStepDeleteSafety={clear:clearArm};
})();
