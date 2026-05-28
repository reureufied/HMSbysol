import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  PencilLine, Trash2, ChevronDown, ChevronUp, FileSpreadsheet, Settings,
  X, Plus, MessageSquare, Copy, RefreshCw, FolderOpen, ChevronRight, GripVertical, GripHorizontal, ArrowUpDown, LogOut,
  Users, User, BookOpen, BookMarked, Target, Save, Calendar, ClipboardList, Lock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import '../App.css';

// ⭐️ 분리한 파일들 불러오기
import { blockInvalidChar, getCustomWeekInfo, getDayOfWeek } from '../utils/helpers';
import StarRating from '../components/StarRating';
import CustomSearchDropdown from '../components/CustomSearchDropdown';

function MainApp({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // [데이터 상태: 빈 배열/객체로 시작 (DB에서 불러옴)]
  const [classes, setClasses] = useState([]);
  const [units, setUnits] = useState([]);
  const [workbooks, setWorkbooks] = useState([]);
  const [records, setRecords] = useState([]); 
  const [scores, setScores] = useState({});
  const [fGradeCriteria, setFGradeCriteria] = useState(50);
  const gradeList = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'];
  const gradeListNoLast = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C']; // C-는 자동 계산
  const defaultPresetCriteria = { 'A+': 4, 'A': 7, 'A-': 12, 'B+': 17, 'B': 20, 'B-': 17, 'C+': 12, 'C': 7, 'C-': 4 };
  const [gradingPresets, setGradingPresets] = useState([{ id: 1, name: '기본', criteria: defaultPresetCriteria }]);
  const [messageTemplate, setMessageTemplate] = useState("안녕하세요. 씨앤씨 수학과 노쌤입니다.\n{날짜} {이름} 학생의 과제 현황 안내 문자 드립니다.");

  // ⭐️ 1. Supabase에서 현재 로그인한 유저 데이터 불러오기
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        // 에러가 났는데 '검색된 행이 없음(PGRST116)'이면 신규 가입자이므로 무시 (기본값 사용)
        if (error && error.code !== 'PGRST116') {
          console.error("데이터 로드 에러:", error);
        }

        if (data && isMounted) {
          setClasses(data.classes || []);
          setUnits(data.units || []);
          setWorkbooks(data.workbooks || []);
          setRecords(data.records || []);
          setScores(data.scores || {});
          setFGradeCriteria(data.f_grade || 50);
          if (data.grading_presets && data.grading_presets.length > 0) {
            setGradingPresets(data.grading_presets);
          } else if (data.rel_criteria) {
            // 구버전 데이터 마이그레이션
            setGradingPresets([{ id: 1, name: '기본', criteria: data.rel_criteria }]);
          }
          setMessageTemplate(data.msg_template || "안녕하세요. 씨앤씨 수학과 노쌤입니다.\n{날짜} {이름} 학생의 과제 현황 안내 문자 드립니다.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsDataLoaded(true);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [session.user.id]);

  // ⭐️ 2. 데이터 변경 시 Supabase로 1.5초마다 자동 저장 (디바운스)
  useEffect(() => {
    if (!isDataLoaded) return; // 데이터 로드 끝나기 전엔 저장 방지

    const saveData = async () => {
      const payload = {
        user_id: session.user.id, // 핵심! 내 아이디 방에만 저장
        classes, units, workbooks, records, scores,
        f_grade: fGradeCriteria.toString(),
        grading_presets: gradingPresets,
        msg_template: messageTemplate
      };
      
      const { error } = await supabase.from('user_data').upsert(payload);
      if (error) console.error("자동 저장 에러:", error);
    };

    const timeoutId = setTimeout(saveData, 1500);
    return () => clearTimeout(timeoutId);
  }, [classes, units, workbooks, records, scores, fGradeCriteria, gradingPresets, messageTemplate, isDataLoaded, session.user.id]);

  // 필터 상태
  const todayInfo = getCustomWeekInfo(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(todayInfo.year.toString());
  const [selectedMonth, setSelectedMonth] = useState(todayInfo.month.toString());
  const [selectedWeek, setSelectedWeek] = useState(todayInfo.week.toString());
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // 동적 주차 계산 로직 
  const maxWeeks = useMemo(() => {
    const y = Number(selectedYear);
    const m = Number(selectedMonth);
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    for (let day = lastDayOfMonth; day >= 21; day--) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const info = getCustomWeekInfo(dateStr);
      if (info.year === y && info.month === m) return info.week;
    }
    return 4; 
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (Number(selectedWeek) > maxWeeks) setSelectedWeek(maxWeeks.toString());
  }, [maxWeeks, selectedWeek]);
  
  // 정렬 상태 
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // UI 조작 상태
  const [newClassName, setNewClassName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [unitSortOrder, setUnitSortOrder] = useState('added');
  const [newWorkbookName, setNewWorkbookName] = useState('');
  const [workbookSortOrder, setWorkbookSortOrder] = useState('added');
  const [newWorkbookDiff, setNewWorkbookDiff] = useState('3.0');
  const diffOptions = ['0.5', '1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];

  // 각종 모달 관리 상태
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [modalType, setModalType] = useState('hw'); 
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingRecord, setPendingRecord] = useState(null);
  const [saveNewUnit, setSaveNewUnit] = useState(true);
  const [saveNewWorkbook, setSaveNewWorkbook] = useState(true);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [hwPresetId, setHwPresetId] = useState(null); // null = 첫 번째(기본) 프리셋 사용

  // 환경설정 통합 수정 모달 상태
  const [editModal, setEditModal] = useState({ isOpen: false, type: '', id: null, name: '', diff: '3.0', classId: null, oldName: '' });

  // 날짜 헤더 수정 모달 상태
  const [dateEditModal, setDateEditModal] = useState({ isOpen: false, oldDate: '', newDate: '' });

  // 유저 메뉴
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [userNickname, setUserNickname] = useState(session.user.user_metadata?.nickname || '');
  const [profileModal, setProfileModal] = useState({ isOpen: false, nickname: '' });
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, newPw: '', confirm: '' });
  const userMenuRef = useRef(null);

  // 열(컬럼) 드래그 순서 상태
  const [columnOrder, setColumnOrder] = useState([]);
  const [dragColId, setDragColId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // 아코디언 상태 (기본: 반관리 열려있음)
  const [openSections, setOpenSections] = useState(['class']);
  const toggleSection = (key) => setOpenSections(prev =>
    prev.includes(key) ? [] : [key]
  );

  // 숙제 입력창 다중 선택 및 입력 상태
  const [selectedTargetClasses, setSelectedTargetClasses] = useState([]);
  const [hwDate, setHwDate] = useState('');
  const [hwCourse, setHwCourse] = useState('대수');
  const [hwUnit, setHwUnit] = useState('');
  const [hwWorkbook, setHwWorkbook] = useState('');
  const [hwDifficulty, setHwDifficulty] = useState('3.0');
  const [hwQuestionInputs, setHwQuestionInputs] = useState([{ id: Date.now(), type: 'A', directCount: '', start: '', end: '', filter: 'all' }]);

  const coursesList = ['6-2', '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '공통수학1', '공통수학2', '대수'];

  // [문제집 자동 난이도 연동]
  useEffect(() => {
    if (hwWorkbook) {
      const matched = workbooks.find(w => w.name === hwWorkbook);
      if (matched) setHwDifficulty(matched.difficulty);
    }
  }, [hwWorkbook, workbooks]);

  // [데이터 필터링]
  const filteredRecords = useMemo(() => {
    return records.filter(item => {
      const info = getCustomWeekInfo(item.date);
      return info.year.toString() === selectedYear &&
             info.month.toString() === selectedMonth &&
             info.week.toString() === selectedWeek &&
             item.classId === selectedClassId;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [records, selectedYear, selectedMonth, selectedWeek, selectedClassId]);

  const currentTotal = useMemo(() => {
    return hwQuestionInputs.reduce((acc, curr) => {
      if (curr.type === 'A') return acc + (Number(curr.directCount) || 0);
      const s = Number(curr.start), e = Number(curr.end);
      if (s <= 0 || e < s) return acc;
      let count = 0;
      for (let i = s; i <= e; i++) {
        if (curr.filter === 'all') count++;
        else if (curr.filter === 'odd' && i % 2 !== 0) count++;
        else if (curr.filter === 'even' && i % 2 === 0) count++;
      }
      return acc + count;
    }, 0);
  }, [hwQuestionInputs]);

  // [점수 업데이트 헬퍼]
  const handleScoreChange = (student, hwId, field, val) => {
    const key = `${student}-${hwId}`;
    setScores(prev => ({ ...prev, [key]: { ...(prev[key] || { correct: '', total: '' }), [field]: val } }));
  };

  // 스프레드시트 엑셀식 방향키/탭키 이동 로직 
  const handleScoreKeyDown = (e, recordIdx, studentIdx, fieldType, numStudents, numRecords) => {
    if (['-', 'e', 'E', '+'].includes(e.key)) { e.preventDefault(); return; }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault(); 
      let nextStudentIdx = studentIdx, nextRecordIdx = recordIdx;
      if (e.shiftKey && e.key === 'Tab') { 
        nextStudentIdx -= 1;
        if (nextStudentIdx < 0) { nextStudentIdx = numStudents - 1; nextRecordIdx -= 1; }
      } else { 
        nextStudentIdx += 1;
        if (nextStudentIdx >= numStudents) { nextStudentIdx = 0; nextRecordIdx += 1; }
      }
      if (nextRecordIdx >= 0 && nextRecordIdx < numRecords) {
        const nextInput = document.getElementById(`input-${fieldType}-${nextRecordIdx}-${nextStudentIdx}`);
        if (nextInput) { nextInput.focus(); nextInput.select(); }
      }
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      let nextStudentIdx = e.key === 'ArrowDown' ? studentIdx + 1 : studentIdx - 1;
      if (nextStudentIdx >= 0 && nextStudentIdx < numStudents) {
        const nextInput = document.getElementById(`input-${fieldType}-${recordIdx}-${nextStudentIdx}`);
        if (nextInput) { nextInput.focus(); nextInput.select(); }
      }
    }
  };

  // [환경 설정 관리 함수]
  const handleDragStart = (e, index) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/html", index); };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, dropIndex) => {
    const dragIndex = Number(e.dataTransfer.getData("text/html"));
    if (dragIndex === dropIndex) return;
    const newClasses = [...classes];
    const draggedItem = newClasses.splice(dragIndex, 1)[0];
    newClasses.splice(dropIndex, 0, draggedItem);
    setClasses(newClasses);
  };
  const handleAddClass = () => { if (!newClassName.trim()) return; setClasses([...classes, { id: Date.now(), name: newClassName, students: [] }]); setNewClassName(''); };
  const handleDeleteClass = (id) => { if (window.confirm('정말 이 반을 삭제하시겠습니까?')) setClasses(classes.filter(cls => cls.id !== id)); };
  const handleAddStudent = (classId) => { if (!newStudentName.trim()) return; setClasses(classes.map(cls => cls.id === classId && !cls.students.includes(newStudentName) ? { ...cls, students: [...cls.students, newStudentName] } : cls)); setNewStudentName(''); };
  const handleDeleteStudent = (classId, studentName) => { if (window.confirm(`${studentName} 학생을 삭제하시겠습니까?`)) setClasses(classes.map(cls => cls.id === classId ? { ...cls, students: cls.students.filter(s => s !== studentName) } : cls)); };
  const handleAddUnit = () => { if (!newUnitName.trim()) return; setUnits([...units, { id: Date.now(), name: newUnitName, addedAt: Date.now() }]); setNewUnitName(''); };
  const handleDeleteUnit = (id) => { if (window.confirm('이 단원을 삭제하시겠습니까?')) setUnits(units.filter(unit => unit.id !== id)); };
  const sortedUnits = [...units].sort((a, b) => unitSortOrder === 'alpha' ? a.name.localeCompare(b.name) : a.addedAt - b.addedAt);
  const handleAddWorkbook = () => { if (!newWorkbookName.trim()) return; setWorkbooks([...workbooks, { id: Date.now(), name: newWorkbookName, difficulty: newWorkbookDiff, addedAt: Date.now() }]); setNewWorkbookName(''); setNewWorkbookDiff('3.0'); };
  const handleDeleteWorkbook = (id) => { if (window.confirm('이 문제집을 삭제하시겠습니까?')) setWorkbooks(workbooks.filter(wb => wb.id !== id)); };
  const sortedWorkbooks = [...workbooks].sort((a, b) => {
    if (workbookSortOrder === 'alpha') return a.name.localeCompare(b.name);
    if (workbookSortOrder === 'difficulty') return Number(b.difficulty) - Number(a.difficulty);
    return a.addedAt - b.addedAt;
  });

  // [통합 수정 모달 처리 함수]
  const openEditModal = (type, item) => {
    setEditModal({ isOpen: true, type, id: item.id, name: item.name, diff: item.difficulty || '3.0', classId: item.classId, oldName: item.oldName });
  };

  const saveEditModal = () => {
    if (!editModal.name.trim()) return;
    if (editModal.type === 'class') {
      setClasses(classes.map(c => c.id === editModal.id ? { ...c, name: editModal.name } : c));
    } else if (editModal.type === 'student') {
      setClasses(classes.map(cls => cls.id === editModal.classId ? { ...cls, students: cls.students.map(s => s === editModal.oldName ? editModal.name : s) } : cls));
    } else if (editModal.type === 'unit') {
      setUnits(units.map(u => u.id === editModal.id ? { ...u, name: editModal.name } : u));
    } else if (editModal.type === 'workbook') {
      setWorkbooks(workbooks.map(w => w.id === editModal.id ? { ...w, name: editModal.name, difficulty: editModal.diff } : w));
    }
    setEditModal({ isOpen: false, type: '', id: null, name: '', diff: '3.0', classId: null, oldName: '' });
  };

  // [기록(숙제/테스트) 추가 모달 및 복제 기능]
  const openItemModal = (type) => {
    setEditingRecordId(null);
    setModalType(type);
    setSelectedTargetClasses([selectedClassId]); 
    setHwDate(new Date().toISOString().split('T')[0]); 
    setHwCourse('대수'); setHwUnit(''); setHwWorkbook(''); setHwDifficulty('3.0');
    setHwQuestionInputs([{ id: Date.now(), type: 'A', directCount: '', start: '', end: '', filter: 'all' }]);
    setIsItemModalOpen(true);
  };

  const handleDuplicateItem = (record) => {
    setEditingRecordId(null);
    setModalType(record.type);
    setSelectedTargetClasses([selectedClassId]);
    setHwDate(new Date().toISOString().split('T')[0]);
    setHwCourse(record.course);
    setHwUnit(record.unit);
    setHwWorkbook(record.workbook);
    setHwDifficulty(record.difficulty || '3.0');
    setHwPresetId(record.presetId || null);
    setHwQuestionInputs([{ id: Date.now(), type: 'A', directCount: '', start: '', end: '', filter: 'all' }]);
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingRecordId(null);
  };

  const handleSaveItem = () => {
    if (!hwUnit || !hwWorkbook || currentTotal === 0) return alert("내용을 확인해주세요.");

    // 수정 모드
    if (editingRecordId) {
      if (selectedTargetClasses.length === 0) return alert("적용할 반을 최소 하나 이상 선택해주세요.");
      const updatedFields = { type: modalType, date: hwDate, course: hwCourse, unit: hwUnit, workbook: hwWorkbook, difficulty: hwDifficulty, totalQuestions: currentTotal, presetId: hwPresetId };
      setRecords(prev => {
        const updated = prev.map(r => r.id === editingRecordId
          ? { ...r, ...updatedFields, classId: selectedTargetClasses[0] } : r);
        const extras = selectedTargetClasses.slice(1).map((cId, idx) => ({
          ...updatedFields, id: Date.now() + idx + 1, classId: cId
        }));
        return extras.length > 0 ? [...updated, ...extras] : updated;
      });
      closeItemModal();
      return;
    }

    if (selectedTargetClasses.length === 0) return alert("적용할 반을 최소 하나 이상 선택해주세요.");
    
    const baseRecord = {
      type: modalType, date: hwDate, course: hwCourse, 
      unit: hwUnit, workbook: hwWorkbook, difficulty: hwDifficulty, totalQuestions: currentTotal, presetId: hwPresetId
    };

    const isNewUnit = !units.some(u => u.name === hwUnit);
    const isNewWorkbook = !workbooks.some(w => w.name === hwWorkbook);

    if (isNewUnit || isNewWorkbook) {
      setPendingRecord(baseRecord);
      setSaveNewUnit(isNewUnit);
      setSaveNewWorkbook(isNewWorkbook);
      setIsConfirmModalOpen(true);
    } else {
      finalizeSave(baseRecord);
    }
  };

  const finalizeConfirmSave = () => {
    if (saveNewUnit && pendingRecord.unit) setUnits(prev => [...prev, { id: Date.now(), name: pendingRecord.unit, addedAt: Date.now() }]);
    if (saveNewWorkbook && pendingRecord.workbook) setWorkbooks(prev => [...prev, { id: Date.now()+1, name: pendingRecord.workbook, difficulty: pendingRecord.difficulty, addedAt: Date.now() }]);
    finalizeSave(pendingRecord);
  };

  const finalizeSave = (baseRecord) => {
    const newRecords = selectedTargetClasses.map((cId, idx) => ({
      ...baseRecord,
      id: Date.now() + idx,
      classId: cId
    }));

    setRecords([...records, ...newRecords]);
    setIsConfirmModalOpen(false); setIsItemModalOpen(false); setPendingRecord(null);

    const savedInfo = getCustomWeekInfo(baseRecord.date);
    if (savedInfo.year.toString() !== selectedYear || savedInfo.month.toString() !== selectedMonth || savedInfo.week.toString() !== selectedWeek) {
      const move = window.confirm(`해당 기록이 ${savedInfo.month}월 ${savedInfo.week}주차에 저장되었습니다.\n해당 주차로 이동할까요?`);
      if (move) {
        setSelectedYear(savedInfo.year.toString());
        setSelectedMonth(savedInfo.month.toString());
        setSelectedWeek(savedInfo.week.toString());
      }
    }
  };

  // 유저 메뉴 바깥 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };
    if (isUserMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleProfileSave = async () => {
    if (!profileModal.nickname.trim()) return alert('이름을 입력해주세요.');
    const { error } = await supabase.auth.updateUser({ data: { nickname: profileModal.nickname.trim() } });
    if (error) return alert('저장 실패: ' + error.message);
    setUserNickname(profileModal.nickname.trim());
    setProfileModal({ isOpen: false, nickname: '' });
  };

  const handlePasswordSave = async () => {
    if (!passwordModal.newPw) return alert('새 비밀번호를 입력해주세요.');
    if (passwordModal.newPw.length < 6) return alert('비밀번호는 6자 이상이어야 합니다.');
    if (passwordModal.newPw !== passwordModal.confirm) return alert('비밀번호가 일치하지 않습니다.');
    const { error } = await supabase.auth.updateUser({ password: passwordModal.newPw });
    if (error) return alert('변경 실패: ' + error.message);
    alert('비밀번호가 변경되었습니다.');
    setPasswordModal({ isOpen: false, newPw: '', confirm: '' });
  };

  // [날짜 일괄 수정/삭제]
  const handleDateEditSave = () => {
    const { oldDate, newDate } = dateEditModal;
    if (!newDate || newDate === oldDate) { setDateEditModal({ isOpen: false, oldDate: '', newDate: '' }); return; }

    // 새 날짜에 이미 같은 반의 항목이 있으면 확인
    const existingOnNewDate = filteredRecords.filter(r => r.date === newDate);
    if (existingOnNewDate.length > 0) {
      const ok = window.confirm(
        `⚠️ ${newDate}에 이미 ${existingOnNewDate.length}개의 항목이 있습니다.\n${oldDate}의 항목을 이 날짜로 합치시겠습니까?`
      );
      if (!ok) { setDateEditModal({ isOpen: false, oldDate: '', newDate: '' }); return; }
    }

    setRecords(prev => prev.map(r =>
      r.date === oldDate && r.classId === selectedClassId ? { ...r, date: newDate } : r
    ));
    setDateEditModal({ isOpen: false, oldDate: '', newDate: '' });
  };

  const handleDateDelete = (date) => {
    const toDelete = filteredRecords.filter(r => r.date === date);
    if (!window.confirm(`${date}의 모든 항목 ${toDelete.length}개를 삭제하시겠습니까?`)) return;
    const idsToDelete = new Set(toDelete.map(r => r.id));
    setRecords(prev => prev.filter(r => !idsToDelete.has(r.id)));
    setScores(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        const id = Number(k.split('-').pop());
        if (idsToDelete.has(id)) delete next[k];
      });
      return next;
    });
  };

  const handleDeleteRecord = (recordId) => {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return;
    setRecords(prev => prev.filter(r => r.id !== recordId));
    setScores(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.endsWith(`-${recordId}`)) delete next[k];
      });
      return next;
    });
  };

  const handleEditRecord = (record) => {
    setEditingRecordId(record.id);
    setSelectedTargetClasses([record.classId.toString()]);
    setModalType(record.type);
    setHwDate(record.date);
    setHwCourse(record.course);
    setHwUnit(record.unit);
    setHwWorkbook(record.workbook);
    setHwDifficulty(record.difficulty || '3.0');
    setHwPresetId(record.presetId || null);
    setHwQuestionInputs([{ id: Date.now(), type: 'A', directCount: String(record.totalQuestions), start: '', end: '', filter: 'all' }]);
    setIsItemModalOpen(true);
  };

  // [등급 계산 로직]
  const getRelativeGrade = (student, hwId) => {
    const record = records.find(r => r.id === hwId);
    const preset = (record?.presetId
      ? gradingPresets.find(p => p.id === record.presetId)
      : null) || gradingPresets[0];
    const criteria = preset?.criteria || defaultPresetCriteria;

    const classStds = classes.find(c => c.id.toString() === selectedClassId)?.students || [];
    const allStudentScores = classStds.map(sName => {
      const s = scores[`${sName}-${hwId}`] || { correct: '', total: '' };
      const total = s.total !== '' ? Number(s.total) : (record?.totalQuestions || 1);
      const rate = s.correct !== '' ? (Number(s.correct) / total) * 100 : -1;
      return { name: sName, rate };
    }).filter(x => x.rate !== -1).sort((a, b) => b.rate - a.rate);

    if (allStudentScores.length === 0) return '미이행';
    const studentRank = allStudentScores.findIndex(s => s.name === student) + 1;
    if (studentRank === 0) return '미이행';

    const rankPercent = (studentRank / allStudentScores.length) * 100;
    let cumulative = 0;
    for (const grade of gradeList) {
      const ratio = Number(criteria[grade] || 0);
      if (ratio <= 0) continue;
      cumulative += ratio;
      if (rankPercent <= cumulative) return grade;
    }
    return 'C-';
  };

  // [등급 기준 프리셋 관리]
  const addGradingPreset = () => {
    const newId = Date.now();
    setGradingPresets(prev => [...prev, { id: newId, name: `기준 ${prev.length + 1}`, criteria: { ...defaultPresetCriteria } }]);
  };
  const deleteGradingPreset = (presetId) => {
    if (gradingPresets.length === 1) return;
    if (!window.confirm('이 등급 기준을 삭제하시겠습니까?\n이 기준을 사용 중인 숙제/테스트는 기본 기준으로 초기화됩니다.')) return;
    setGradingPresets(prev => prev.filter(p => p.id !== presetId));
    setRecords(prev => prev.map(r => r.presetId === presetId ? { ...r, presetId: null } : r));
  };
  const updatePresetName = (presetId, name) => {
    setGradingPresets(prev => prev.map(p => p.id === presetId ? { ...p, name } : p));
  };
  const updatePresetCriteria = (presetId, grade, value) => {
    setGradingPresets(prev => prev.map(p => {
      if (p.id !== presetId) return p;
      const newCriteria = { ...p.criteria, [grade]: value };
      // C-는 나머지 자동 계산
      const sumOthers = gradeListNoLast.reduce((s, g) => s + Number(newCriteria[g] || 0), 0);
      newCriteria['C-'] = Math.max(0, 100 - sumOthers);
      return { ...p, criteria: newCriteria };
    }));
  };

  const generateMsg = (student) => {
    const dateStr = `${selectedMonth}월 ${selectedWeek}주차`;
    let msg = messageTemplate.replace(/{이름}/g, student).replace(/{날짜}/g, dateStr);
    msg += `\n\n-----------------------------------\n`;
    
    // 테스트 기록 제외 (숙제만) - 사용자가 지정한 열 순서 반영
    const hwRecords = orderedRecords.filter(r => r.type === 'hw');
    
    // 날짜별로 그룹화
    const groupedByDate = {};
    hwRecords.forEach(hw => {
      if (!groupedByDate[hw.date]) groupedByDate[hw.date] = [];
      groupedByDate[hw.date].push(hw);
    });

    Object.keys(groupedByDate).sort().forEach(date => {
      const dateObj = new Date(date);
      msg += `\n■ ${dateObj.getMonth()+1}월 ${dateObj.getDate()}일(${getDayOfWeek(date)}) ■\n\n`;
      
      let dateTotalQuestions = 0;
      let dateCompletedQuestions = 0;

      groupedByDate[date].forEach(hw => {
        const s = scores[`${student}-${hw.id}`] || { correct: '', total: '' };
        const actualTotal = s.total !== '' ? Number(s.total) : hw.totalQuestions;
        const correct = s.correct;
        const isMissing = correct === '';
        const rate = !isMissing && actualTotal > 0 ? (Number(correct) / actualTotal) * 100 : 0;

        dateTotalQuestions += actualTotal;
        if (!isMissing && rate >= Number(fGradeCriteria)) {
          dateCompletedQuestions += actualTotal;
        }
      });

      const completionRate = dateTotalQuestions === 0 ? 0 : Math.round((dateCompletedQuestions / dateTotalQuestions) * 1000) / 10;
      
      msg += `과제이행도 : ${completionRate.toFixed(1)}%\n\n과제완성도(정답률 / 상대등급 / 총 문항수)\n[F등급 기준: 과제 미이행 or 정답률 ${fGradeCriteria}% 미만인 경우]\n`;
      
      groupedByDate[date].forEach(hw => {
        const s = scores[`${student}-${hw.id}`] || { correct: '', total: '' };
        const total = s.total !== '' ? Number(s.total) : hw.totalQuestions;
        const correct = s.correct;
        const isMissing = correct === '';
        const rate = !isMissing && total > 0 ? Math.round((Number(correct) / total) * 1000) / 10 : 0;
        
        let grade;
        if (isMissing) {
          grade = '미이행';
        } else if (rate < Number(fGradeCriteria)) {
          grade = 'F';
        } else {
          grade = getRelativeGrade(student, hw.id);
        }
        
        const diffVal = Number(hw.difficulty);
        const textStars = '★'.repeat(Math.floor(diffVal)) + (diffVal % 1 !== 0 ? '☆' : '');

        msg += `\n▶ ${hw.course} \`${hw.unit}\` 단원\n(난이도: ${textStars} [${diffVal}단계])\n`;
        if (isMissing) {
          msg += `: 미이행 / 총 ${total}문항\n`;
        } else {
          msg += `: ${rate}% / ${grade} 등급 / 총 ${total}문항\n`;
        }
      });
      msg += `\n-----------------------------------\n`;
    });

    setGeneratedMsg(msg); 
    setIsMsgModalOpen(true);
  };

  // 열 드래그 핸들러
  const handleColDragStart = (e, recordId) => {
    setDragColId(recordId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleColDragOver = (e, recordId) => {
    e.preventDefault();
    if (recordId === dragColId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    setDragOverId({ id: recordId, side });
  };
  const handleColDragEnd = () => { setDragColId(null); setDragOverId(null); };
  const handleColDrop = (e, targetRecordId) => {
    e.preventDefault();
    if (!dragColId || dragColId === targetRecordId) { handleColDragEnd(); return; }

    const dragRecord = filteredRecords.find(r => r.id === dragColId);
    const targetRecord = filteredRecords.find(r => r.id === targetRecordId);
    const dropSide = dragOverId?.side || 'left';

    if (dragRecord && targetRecord && dragRecord.date !== targetRecord.date) {
      const ok = window.confirm(
        `⚠️ 날짜 변경 경고\n\n이 항목의 날짜가\n"${dragRecord.date}" → "${targetRecord.date}"로 변경됩니다.\n\n계속하시겠습니까?`
      );
      if (!ok) { handleColDragEnd(); return; }
      setRecords(prev => prev.map(r => r.id === dragColId ? { ...r, date: targetRecord.date } : r));
    }

    const currentOrder = orderedRecords.map(r => r.id);
    const newOrder = [...currentOrder];
    const fromIdx = newOrder.indexOf(dragColId);
    newOrder.splice(fromIdx, 1);
    // 제거 후 타깃의 새 위치를 다시 찾아서 좌/우에 따라 삽입
    const newToIdx = newOrder.indexOf(targetRecordId);
    newOrder.splice(dropSide === 'right' ? newToIdx + 1 : newToIdx, 0, dragColId);
    setColumnOrder(newOrder);
    handleColDragEnd();
  };

  const handleSort = (key) => setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));

  const sortedStudents = useMemo(() => {
    const cls = classes.find(c => c.id.toString() === selectedClassId);
    if (!cls) return [];
    const stds = [...cls.students];

    stds.sort((a, b) => {
      if (sortConfig.key === 'name') return sortConfig.direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      const hwId = sortConfig.key;
      const getRate = (std) => {
        const s = scores[`${std}-${hwId}`];
        if (!s || s.correct === '') return -1;
        const total = s.total !== '' ? Number(s.total) : (filteredRecords.find(r => r.id === hwId)?.totalQuestions || 1);
        return Number(s.correct) / total;
      };
      const rateA = getRate(a);
      const rateB = getRate(b);
      return sortConfig.direction === 'asc' ? rateA - rateB : rateB - rateA;
    });
    return stds;
  }, [classes, selectedClassId, scores, filteredRecords, sortConfig]);

  // 필터(반/날짜) 변경 시 열 순서 초기화
  useEffect(() => {
    setColumnOrder([]);
  }, [selectedClassId, selectedYear, selectedMonth, selectedWeek]);

  // 사용자가 드래그로 바꾼 순서 반영 + 새로 추가된 항목은 날짜순으로 자연 삽입
  const orderedRecords = useMemo(() => {
    if (columnOrder.length === 0) return filteredRecords;
    const orderMap = Object.fromEntries(columnOrder.map((id, i) => [id, i]));
    return [...filteredRecords].sort((a, b) => {
      const ai = orderMap[a.id];
      const bi = orderMap[b.id];
      // 둘 다 명시적 순서 → 그 순서대로
      if (ai !== undefined && bi !== undefined) return ai - bi;
      // 둘 다 새 항목 → 날짜순
      if (ai === undefined && bi === undefined) {
        const d = new Date(a.date) - new Date(b.date);
        return d !== 0 ? d : a.id - b.id;
      }
      // 하나만 명시적 → 날짜 비교, 같은 날엔 명시적 항목이 먼저
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return ai !== undefined ? -1 : 1;
    });
  }, [filteredRecords, columnOrder]);

  const uniqueDates = [...new Set(orderedRecords.map(r => r.date))];

  // 메인 프로그램 화면 구성
  if (!isDataLoaded) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' }}><h2>사용자 데이터를 불러오는 중입니다... 🔄</h2></div>;
  }

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="nav-logo"><span className="logo-icon">💛</span><h1>노쌤반</h1></div>
        <div className="nav-tabs">
          <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><FileSpreadsheet size={18} /> 성적 관리</button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={18} /> 환경 설정</button>
          <div className="user-menu-wrapper" ref={userMenuRef}>
            <button className="user-avatar-btn" onClick={() => setIsUserMenuOpen(v => !v)}>
              {(userNickname || session.user.email)[0].toUpperCase()}
            </button>
            {isUserMenuOpen && (
              <div className="user-dropdown">
                <div className="user-info-panel">
                  <div className="user-nickname-text">{userNickname || '이름을 설정해주세요'}</div>
                  <div className="user-email-text">{session.user.email}</div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item-btn" onClick={() => { setProfileModal({ isOpen: true, nickname: userNickname }); setIsUserMenuOpen(false); }}>
                  <PencilLine size={15} /> 프로필 수정
                </button>
                <button className="dropdown-item-btn" onClick={() => { setPasswordModal({ isOpen: true, newPw: '', confirm: '' }); setIsUserMenuOpen(false); }}>
                  <Lock size={15} /> 비밀번호 변경
                </button>
                <div className="dropdown-divider" />
                <button className="dropdown-item-btn danger" onClick={() => supabase.auth.signOut()}>
                  <LogOut size={15} /> 로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className={`main-content ${activeTab}`}>
        {activeTab === 'dashboard' ? (
          <div className="dashboard-container">
            {/* 책꽂이 필터 */}
            <div className="bookshelf-filter">
              <div className="filter-group"><label><FolderOpen size={14}/> 년도</label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                  {["2026", "2027", "2028", "2029", "2030", "2031", "2032" ].map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
              </div>
              <ChevronRight className="divider-icon" size={16}/>
              <div className="filter-group"><label>월</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <ChevronRight className="divider-icon" size={16}/>
              <div className="filter-group"><label>주차</label>
                <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                  {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(w => (
                    <option key={w} value={w}>{w}주차</option>
                  ))}
                </select>
              </div>
              <ChevronRight className="divider-icon" size={16}/>
              <div className="filter-group"><label>반 선택</label>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                  <option value="">-- 반 선택 --</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {selectedClassId ? (
              <div className="table-area" style={{ border: 'none', padding: '0 0 0 0' }}>
                <div className="table-container" style={{ border: '1px solid #CED4DA', borderRadius: '8px' }}>
                  <table className="score-table">
                    <thead>
                      <tr>
                        <th className="student-col" rowSpan="2">
                          <div className="th-flex" onClick={() => handleSort('name')}>
                            학생 이름 <ArrowUpDown size={14} className="sort-icon"/>
                          </div>
                        </th>
                        
                        {uniqueDates.map((date, dateIdx) => {
                          const recordsForDate = orderedRecords.filter(r => r.date === date);
                          const themeClass = dateIdx % 2 === 0 ? 'theme-yellow' : 'theme-blue';
                          return (
                            <th key={date} colSpan={recordsForDate.length} className={`hw-header-date-merged ${themeClass} ${dateIdx > 0 ? 'date-divider' : ''}`}>
                              <div className="date-header-inner">
                                <span>{date} ({getDayOfWeek(date)})</span>
                                <div className="date-header-actions">
                                  <button className="icon-btn date-action-btn edit-btn" title="날짜 수정" onClick={() => setDateEditModal({ isOpen: true, oldDate: date, newDate: date })}><PencilLine size={12} /></button>
                                  <button className="icon-btn date-action-btn delete-btn" title="날짜 전체 삭제" onClick={() => handleDateDelete(date)}><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </th>
                          );
                        })}
                        
                        <th className="add-hw-col" rowSpan="2" style={{minWidth: '140px'}}>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                            <button className="btn-add-hw-table" onClick={() => openItemModal('hw')}><Plus size={14}/> 새 숙제</button>
                            <button className="btn-add-test-table" onClick={() => openItemModal('test')}><Plus size={14}/> 새 테스트</button>
                          </div>
                        </th>
                      </tr>

                      <tr>
                        {orderedRecords.map((record, idx) => {
                          const dateIndex = uniqueDates.indexOf(record.date);
                          const themeClass = record.type === 'test' ? 'theme-test' : (dateIndex % 2 === 0 ? 'theme-yellow' : 'theme-blue');
                          const isNewDate = idx > 0 && orderedRecords[idx - 1].date !== record.date;

                          return (
                            <th
                              key={record.id}
                              className={`hw-col-header ${themeClass} ${isNewDate ? 'date-divider' : ''} ${dragColId === record.id ? 'col-is-dragging' : ''} ${dragOverId?.id === record.id ? `col-drag-over-${dragOverId.side}` : ''}`}
                              draggable
                              onDragStart={(e) => handleColDragStart(e, record.id)}
                              onDragOver={(e) => handleColDragOver(e, record.id)}
                              onDrop={(e) => handleColDrop(e, record.id)}
                              onDragEnd={handleColDragEnd}
                            >
                              <div className="col-drag-handle" title="드래그하여 순서 변경">
                                <GripHorizontal size={12} />
                              </div>
                              <div className="hw-inner">
                                <div className="hw-row1">
                                  <span className="hw-course-unit">
                                    {record.course} {record.unit}
                                    {record.type === 'test' && <span style={{color: '#6741D9', marginLeft: '3px'}}>테스트</span>}
                                  </span>
                                </div>
                                <div className="hw-row2" onClick={(e) => { e.stopPropagation(); handleSort(record.id); }}>
                                  <span className="hw-wb-text">{record.workbook}</span>
                                  <span className="hw-count-text">· {record.totalQuestions}문항</span>
                                  <ArrowUpDown size={10} className="sort-icon" />
                                </div>
                                <div className="hw-actions">
                                  <button className="icon-btn hw-action-btn edit-btn" onClick={(e) => { e.stopPropagation(); handleEditRecord(record); }} title="수정"><PencilLine size={12} /></button>
                                  <button className="icon-btn hw-action-btn" onClick={(e) => { e.stopPropagation(); handleDuplicateItem(record); }} title="복제"><Copy size={12} /></button>
                                  <button className="icon-btn hw-action-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record.id); }} title="삭제"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </th>                            
                          );
                        })}
                      </tr>
                    </thead>    
                    <tbody>
                      {sortedStudents.map((student, studentIdx) => (
                        <tr key={student}>
                          <td className="student-name-cell student-col">
                            <div className="student-cell-flex">{student}<button className="btn-msg-bubble" onClick={() => generateMsg(student)}><MessageSquare size={14}/></button></div>
                          </td>
                          {orderedRecords.map((record, recordIdx) => {
                            const key = `${student}-${record.id}`;
                            const sObj = scores[key] || { correct: '', total: '' };
                            const actualTotal = sObj.total !== '' ? Number(sObj.total) : record.totalQuestions;
                            const correct = sObj.correct;
                            const rate = correct !== '' && actualTotal > 0 ? Math.round((Number(correct) / actualTotal) * 1000) / 10 : null;
                            const isNewDate = recordIdx > 0 && orderedRecords[recordIdx - 1].date !== record.date;
                            
                            return (
                              <td key={record.id} className={`score-cell ${record.type === 'test' ? 'test-col-cell' : ''} ${rate !== null && rate < fGradeCriteria ? 'warning-cell' : ''} ${isNewDate ? 'date-divider' : ''}`}>
                                <div className="score-input-box extended">
                                  <input 
                                    id={`input-correct-${recordIdx}-${studentIdx}`}
                                    type="number" min="0" 
                                    onKeyDown={(e) => handleScoreKeyDown(e, recordIdx, studentIdx, 'correct', sortedStudents.length, orderedRecords.length)}
                                    value={correct} onChange={e => handleScoreChange(student, record.id, 'correct', e.target.value)} 
                                    placeholder="0" className="inp-correct" 
                                  />
                                  <span className="slash">/</span>
                                  <input 
                                    id={`input-total-${recordIdx}-${studentIdx}`}
                                    type="number" min="0" 
                                    onKeyDown={(e) => handleScoreKeyDown(e, recordIdx, studentIdx, 'total', sortedStudents.length, orderedRecords.length)}
                                    value={sObj.total} onChange={e => handleScoreChange(student, record.id, 'total', e.target.value)} 
                                    placeholder={record.totalQuestions} className="inp-total" 
                                  />
                                  {rate !== null && <span className="rate-label">{rate}%</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td className="score-cell empty-cell"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <div className="empty-state">책꽂이에서 '반'을 선택하여 파일을 열어주세요.</div>}
          </div>
        ) : (
          <div className="accordion-container">

            {/* 아코디언 1: 반 및 학생 관리 */}
            <div className="acc-item">
              <button className={`acc-header ${openSections.includes('class') ? 'open' : ''}`} onClick={() => { if (openSections.includes('class')) setExpandedClassId(null); toggleSection('class'); }}>
                <span className="acc-header-label"><Users size={17}/> 반 및 학생 관리</span>
                <ChevronDown size={18} className="acc-arrow" />
              </button>
              {openSections.includes('class') && (
                <div className="acc-body">
                  <div className="input-group">
                    <input type="text" placeholder="새로운 반 이름" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddClass()} />
                    <button className="btn-primary" onClick={handleAddClass}>추가</button>
                  </div>
                  <div className="list-toolbar"><span className="list-label">등록된 반 목록 (드래그하여 순서 변경)</span></div>
                  <ul className="simple-list">
                    {classes.map((cls, index) => (
                      <li key={cls.id} className="class-item-box" draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e)} onDrop={(e) => handleDrop(e, index)} style={{flexDirection: 'column', alignItems: 'stretch', padding: 0}}>
                        <div className="class-title" onClick={() => setExpandedClassId(expandedClassId === cls.id ? null : cls.id)} style={{display: 'flex', textAlign: 'left', padding: '10px 8px'}}>
                          <GripVertical size={18} className="drag-handle" style={{cursor: 'grab'}}/>
                          <span style={{flex: 1, margin: '0 10px'}}>{cls.name} <span style={{fontSize:'13px', color:'#868E96'}}>({cls.students.length}명)</span></span>
                          <div className="action-icons">
                            <button className="icon-btn edit-btn" onClick={(e) => { e.stopPropagation(); openEditModal('class', { id: cls.id, name: cls.name }); }}><PencilLine size={16} /></button>
                            <button className="icon-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }}><Trash2 size={16} /></button>
                            <span className="toggle-icon">{expandedClassId === cls.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                          </div>
                        </div>
                        {expandedClassId === cls.id && (
                          <div className="class-content" style={{padding: '12px', background: '#F8F9FA', borderTop: '1px dashed #DEE2E6'}}>
                            <div className="input-group">
                              <input type="text" placeholder="학생 이름" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddStudent(cls.id)} />
                              <button className="btn-secondary" onClick={() => handleAddStudent(cls.id)}>추가</button>
                            </div>
                            <ul className="simple-list" style={{marginTop: '10px'}}>
                              {cls.students.length === 0
                                ? <li style={{color: '#ADB5BD', fontSize: '13px', padding: '10px 0'}}>등록된 학생이 없습니다.</li>
                                : [...cls.students].sort((a, b) => a.localeCompare(b)).map((student, idx) => (
                                  <li key={idx} style={{borderBottom: '1px solid #F1F3F5', padding: '8px 4px'}}>
                                    <span>{student}</span>
                                    <div className="action-icons">
                                      <button className="icon-btn edit-btn" onClick={() => openEditModal('student', { classId: cls.id, oldName: student, name: student })}><PencilLine size={16} /></button>
                                      <button className="icon-btn delete-btn" onClick={() => handleDeleteStudent(cls.id, student)}><Trash2 size={16} /></button>
                                    </div>
                                  </li>
                                ))
                              }
                            </ul>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 아코디언 2: 단원명 설정 */}
            <div className="acc-item">
              <button className={`acc-header ${openSections.includes('unit') ? 'open' : ''}`} onClick={() => toggleSection('unit')}>
                <span className="acc-header-label"><BookOpen size={17}/> 단원명 설정</span>
                <ChevronDown size={18} className="acc-arrow" />
              </button>
              {openSections.includes('unit') && (
                <div className="acc-body">
                  <div className="input-group">
                    <input type="text" placeholder="단원명 추가" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddUnit()} />
                    <button className="btn-primary" onClick={handleAddUnit}>추가</button>
                  </div>
                  <div className="list-toolbar">
                    <span className="list-label">등록된 단원</span>
                    <select className="sort-select" value={unitSortOrder} onChange={(e) => setUnitSortOrder(e.target.value)}>
                      <option value="added">추가한순 정렬</option><option value="alpha">가나다순 정렬</option>
                    </select>
                  </div>
                  <ul className="simple-list">
                    {sortedUnits.map(unit => (
                      <li key={unit.id}>
                        <span>{unit.name}</span>
                        <div className="action-icons">
                          <button className="icon-btn edit-btn" onClick={() => openEditModal('unit', { id: unit.id, name: unit.name })}><PencilLine size={16} /></button>
                          <button className="icon-btn delete-btn" onClick={() => handleDeleteUnit(unit.id)}><Trash2 size={16} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 아코디언 3: 문제집 관리 */}
            <div className="acc-item">
              <button className={`acc-header ${openSections.includes('workbook') ? 'open' : ''}`} onClick={() => toggleSection('workbook')}>
                <span className="acc-header-label"><BookMarked size={17}/> 문제집 및 난이도</span>
                <ChevronDown size={18} className="acc-arrow" />
              </button>
              {openSections.includes('workbook') && (
                <div className="acc-body">
                  <div className="input-group">
                    <input type="text" placeholder="문제집 이름" value={newWorkbookName} onChange={(e) => setNewWorkbookName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddWorkbook()} />
                    <select value={newWorkbookDiff} onChange={(e) => setNewWorkbookDiff(e.target.value)}>
                      {diffOptions.map(n => <option key={n} value={n}>{n} 단계</option>)}
                    </select>
                    <button className="btn-primary" onClick={handleAddWorkbook}>추가</button>
                  </div>
                  <div className="list-toolbar">
                    <span className="list-label">등록된 문제집</span>
                    <select className="sort-select" value={workbookSortOrder} onChange={(e) => setWorkbookSortOrder(e.target.value)}>
                      <option value="added">추가한순 정렬</option><option value="alpha">가나다순 정렬</option>
                      <option value="difficulty">난이도순 정렬</option>
                    </select>
                  </div>
                  <ul className="simple-list">
                    {sortedWorkbooks.map(wb => (
                      <li key={wb.id} className="workbook-item">
                        <span className="wb-name">{wb.name}</span>
                        <div className="wb-diff">
                          <StarRating value={wb.difficulty} />
                          <span className="diff-num">{wb.difficulty}</span>
                        </div>
                        <div className="action-icons">
                          <button className="icon-btn edit-btn" onClick={() => openEditModal('workbook', { id: wb.id, name: wb.name, difficulty: wb.difficulty })}><PencilLine size={16} /></button>
                          <button className="icon-btn delete-btn" onClick={() => handleDeleteWorkbook(wb.id)}><Trash2 size={16} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 아코디언 4: 평가 기준 */}
            <div className="acc-item">
              <button className={`acc-header ${openSections.includes('eval') ? 'open' : ''}`} onClick={() => toggleSection('eval')}>
                <span className="acc-header-label"><Target size={17}/> 평가 기준 설정</span>
                <ChevronDown size={18} className="acc-arrow" />
              </button>
              {openSections.includes('eval') && (
                <div className="acc-body">
                  {/* F등급 기준 */}
                  <div className="criteria-setting">
                    <label>F등급 기준 정답률:</label>
                    <div className="input-with-text">
                      <input type="number" min="0" onKeyDown={blockInvalidChar} value={fGradeCriteria} onChange={e => setFGradeCriteria(e.target.value)} className="number-input" />
                      <span>% 미만</span>
                    </div>
                  </div>
                  <hr className="divider-line" />
                  {/* 등급 기준 프리셋 목록 */}
                  <div className="criteria-setting">
                    <label>상대평가 등급 기준 프리셋</label>
                    <p className="helper-text">* C- 비율은 나머지 합계로 자동 계산됩니다. 숙제/테스트마다 다른 기준을 적용할 수 있습니다.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {gradingPresets.map(preset => {
                      const sumOthers = gradeListNoLast.reduce((s, g) => s + Number(preset.criteria[g] || 0), 0);
                      const autoCMinus = Math.max(0, 100 - sumOthers);
                      const isOver = sumOthers > 100;
                      return (
                        <div key={preset.id} className="preset-card">
                          <div className="preset-card-header">
                            <input
                              className="preset-name-input"
                              value={preset.name}
                              onChange={e => updatePresetName(preset.id, e.target.value)}
                              placeholder="기준 이름"
                            />
                            <button
                              className="icon-btn delete-btn"
                              onClick={() => deleteGradingPreset(preset.id)}
                              disabled={gradingPresets.length === 1}
                              title="삭제"
                              style={{ padding: '4px', opacity: gradingPresets.length === 1 ? 0.3 : 1 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="eval-table">
                              <thead>
                                <tr>
                                  {gradeListNoLast.map(g => <th key={g}>{g}</th>)}
                                  <th style={{ color: '#929AA3' }}>C-<span style={{ fontSize: '10px', marginLeft: '2px' }}>(자동)</span></th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {gradeListNoLast.map(g => (
                                    <td key={g}>
                                      <input
                                        type="number" min="0" max="100"
                                        onKeyDown={blockInvalidChar}
                                        value={preset.criteria[g]}
                                        onChange={e => updatePresetCriteria(preset.id, g, e.target.value)}
                                      />
                                    </td>
                                  ))}
                                  <td>
                                    <input
                                      type="number"
                                      value={autoCMinus}
                                      readOnly
                                      style={{ background: '#F1F3F5', color: '#868E96', cursor: 'not-allowed' }}
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div className={`preset-total ${isOver ? 'preset-total-over' : 'preset-total-ok'}`}>
                            합계: <strong>{sumOthers + autoCMinus}%</strong>
                            {isOver ? ' ⚠ 100%를 초과했습니다' : ' ✓'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button className="btn-add-preset" onClick={addGradingPreset}>
                    <Plus size={14} /> 새 기준 추가
                  </button>
                </div>
              )}
            </div>

            {/* 아코디언 5: 메시지 설정 */}
            <div className="acc-item">
              <button className={`acc-header ${openSections.includes('msg') ? 'open' : ''}`} onClick={() => toggleSection('msg')}>
                <span className="acc-header-label"><MessageSquare size={17}/> 메시지 설정</span>
                <ChevronDown size={18} className="acc-arrow" />
              </button>
              {openSections.includes('msg') && (
                <div className="acc-body">
                  <div className="criteria-setting">
                    <label>메시지 템플릿</label>
                    <p className="helper-text">* <strong>{'{이름}'}</strong>, <strong>{'{날짜}'}</strong>는 자동 치환됩니다.</p>
                    <textarea className="message-textarea" value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <span>Made by <strong>Sol</strong> </span>
          <span className="footer-sub">Homework Management System</span>
        </div>
      </footer>

      {/* 모달: 환경설정 항목 개별 수정 (공통) */}
      {editModal.isOpen && (
        <div className="modal-overlay z-top">
          <div className="modal-content mini">
            <div className="modal-header">
              <h3>
                {editModal.type === 'class' ? <><Users size={16}/> 반 이름 수정</> :
                 editModal.type === 'student' ? <><User size={16}/> 학생 이름 수정</> :
                 editModal.type === 'unit' ? <><BookOpen size={16}/> 단원명 수정</> : <><BookMarked size={16}/> 문제집 수정</>}
              </h3>
              <button className="btn-close" onClick={() => setEditModal({ isOpen: false, type: '', id: null, name: '', diff: '3.0', classId: null, oldName: '' })}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>이름</label>
                <input type="text" value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value})} />
              </div>
              {editModal.type === 'workbook' && (
                <div className="form-group">
                  <label>난이도</label>
                  <select value={editModal.diff} onChange={e => setEditModal({...editModal, diff: e.target.value})}>
                    {diffOptions.map(n => <option key={n} value={n}>{n} 단계</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditModal({ isOpen: false, type: '', id: null, name: '', diff: '3.0', classId: null, oldName: '' })}>취소</button>
              <button className="btn-primary" onClick={saveEditModal}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 숙제/테스트 추가 */}
      {isItemModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingRecordId ? <><PencilLine size={16}/> {modalType === 'test' ? '테스트 수정' : '숙제 수정'}</> : <><ClipboardList size={16}/> {modalType === 'test' ? '새 테스트 추가' : '새 숙제 추가'}</>}</h3>
              <button className="btn-close" onClick={closeItemModal}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="modal-form-grid">

                <div className="form-group" style={{ gridColumn: '1 / span 2', marginBottom: '5px' }}>
                  <label>적용할 반 선택{editingRecordId ? ' (다중 선택 시 해당 반에도 복사)' : ' (다중 선택 가능)'}</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {classes.map(c => {
                      const isSelected = selectedTargetClasses.includes(c.id.toString());
                      return (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: isSelected ? '#E9ECEF' : '#F8F9FA', padding: '8px 14px', borderRadius: '8px', border: `1px solid ${isSelected ? '#868E96' : '#DEE2E6'}`, transition: 'all 0.2s' }}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => {
                            if (e.target.checked) setSelectedTargetClasses([...selectedTargetClasses, c.id.toString()]);
                            else setSelectedTargetClasses(selectedTargetClasses.filter(id => id !== c.id.toString()));
                          }} style={{ display: 'none' }} />
                          <span style={{ fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? '#212529' : '#495057', fontSize: '13px' }}>{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group"><label>날짜</label><input type="date" value={hwDate} onChange={e => setHwDate(e.target.value)} /></div>
                <div className="form-group"><label>과정</label><select value={hwCourse} onChange={e => setHwCourse(e.target.value)}>{coursesList.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="form-group dropdown-field" style={{ position: 'relative', zIndex: 100 }}><label>단원명</label><CustomSearchDropdown value={hwUnit} onChange={setHwUnit} options={units} placeholder="단원" /></div>
                <div className="form-group dropdown-field" style={{ position: 'relative', zIndex: 99 }}><label>문제집 및 난이도</label>
                  <div className="input-with-select">
                    <div className="custom-dropdown-wrapper">
                      <CustomSearchDropdown value={hwWorkbook} onChange={setHwWorkbook} options={workbooks} placeholder="문제집" onSelectExisting={(opt) => setHwDifficulty(opt.difficulty)}/>
                    </div>
                    <select className="diff-select" value={hwDifficulty} onChange={e => setHwDifficulty(e.target.value)}>
                      {diffOptions.map(n => <option key={n} value={n}>{n} 단계</option>)}
                    </select>
                  </div>
                </div>
                {gradingPresets.length > 1 && (
                  <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                    <label>등급 기준</label>
                    <select
                      value={hwPresetId || gradingPresets[0]?.id || ''}
                      onChange={e => setHwPresetId(Number(e.target.value))}
                    >
                      {gradingPresets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="calc-group">
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '600' }}>문항 수 자동 계산</label>
                <div className="calc-rows-container">
                  {hwQuestionInputs.map((input, idx) => (
                    <div className="q-calc-row" key={input.id}>
                      <select className="q-type-select" value={input.type} onChange={e => { const ni = [...hwQuestionInputs]; ni[idx].type = e.target.value; setHwQuestionInputs(ni); }}><option value="A">개수</option><option value="B">범위</option></select>
                      {input.type === 'A' ? (
                        <div className="q-input-area"><input type="number" min="0" onKeyDown={blockInvalidChar} className="q-num-input" value={input.directCount} onChange={e => { const ni = [...hwQuestionInputs]; ni[idx].directCount = e.target.value; setHwQuestionInputs(ni); }}/>개</div>
                      ) : (
                        <div className="q-input-area">
                          <input type="number" min="0" onKeyDown={blockInvalidChar} className="q-num-input" value={input.start} onChange={e => { const ni = [...hwQuestionInputs]; ni[idx].start = e.target.value; setHwQuestionInputs(ni); }}/>~
                          <input type="number" min="0" onKeyDown={blockInvalidChar} className="q-num-input" value={input.end} onChange={e => { const ni = [...hwQuestionInputs]; ni[idx].end = e.target.value; setHwQuestionInputs(ni); }}/>중
                          <select value={input.filter} onChange={e => { const ni = [...hwQuestionInputs]; ni[idx].filter = e.target.value; setHwQuestionInputs(ni); }}><option value="all">전체</option><option value="odd">홀수</option><option value="even">짝수</option></select>
                        </div>
                      )}
                      <button className="btn-del" onClick={() => setHwQuestionInputs(hwQuestionInputs.filter(h => h.id !== input.id))} disabled={hwQuestionInputs.length === 1}><X size={14}/></button>
                    </div>
                  ))}
                </div>
                <div className="q-calc-footer">
                  <button className="btn-text-add" onClick={() => setHwQuestionInputs([...hwQuestionInputs, { id: Date.now(), type: 'A', directCount: '', start: '', end: '', filter: 'all' }])}>+ 문항 수 추가하기</button>
                  <div className="q-total-result">합산 결과:
                    <strong> {currentTotal}</strong> 문항
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeItemModal}>취소</button>
              <button className="btn-primary" onClick={handleSaveItem}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 프리셋 저장 스위치 */}
      {isConfirmModalOpen && (
        <div className="modal-overlay z-top">
          <div className="modal-content mini">
            <div className="modal-header"><h3><Save size={16}/> 새 프리셋 저장</h3></div>
            <div className="modal-body confirm-body">
              <p>기존에 없던 새로운 항목이 있습니다.<br/>환경 설정에 저장하시겠습니까?</p>
              {pendingRecord && !units.some(u => u.name === pendingRecord.unit) && (
                <div className="confirm-switch-row">
                  <div className="confirm-label">단원명: <strong>{pendingRecord.unit}</strong></div>
                  <div className="toggle-switch">
                    <button className={!saveNewUnit ? 'active' : ''} onClick={() => setSaveNewUnit(false)}>저장 안 함</button>
                    <button className={saveNewUnit ? 'active' : ''} onClick={() => setSaveNewUnit(true)}>저장</button>
                  </div>
                </div>
              )}
              {pendingRecord && !workbooks.some(w => w.name === pendingRecord.workbook) && (
                <div className="confirm-switch-row">
                  <div className="confirm-label">문제집: <strong>{pendingRecord.workbook}</strong> (★{pendingRecord.difficulty})</div>
                  <div className="toggle-switch">
                    <button className={!saveNewWorkbook ? 'active' : ''} onClick={() => setSaveNewWorkbook(false)}>저장 안 함</button>
                    <button className={saveNewWorkbook ? 'active' : ''} onClick={() => setSaveNewWorkbook(true)}>저장</button>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={finalizeConfirmSave} style={{width: '100%'}}>확인 후 추가완료</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 프로필 수정 */}
      {profileModal.isOpen && (
        <div className="modal-overlay z-top">
          <div className="modal-content mini">
            <div className="modal-header">
              <h3><User size={16}/> 프로필 수정</h3>
              <button className="btn-close" onClick={() => setProfileModal({ isOpen: false, nickname: '' })}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>이메일</label>
                <input type="text" value={session.user.email} disabled style={{ color: 'var(--text-muted)', background: 'var(--bg)' }} />
              </div>
              <div className="form-group">
                <label>이름 / 닉네임</label>
                <input type="text" placeholder="표시될 이름 입력" value={profileModal.nickname} onChange={e => setProfileModal(p => ({ ...p, nickname: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleProfileSave()} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setProfileModal({ isOpen: false, nickname: '' })}>취소</button>
              <button className="btn-primary" onClick={handleProfileSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 비밀번호 변경 */}
      {passwordModal.isOpen && (
        <div className="modal-overlay z-top">
          <div className="modal-content mini">
            <div className="modal-header">
              <h3><Lock size={16}/> 비밀번호 변경</h3>
              <button className="btn-close" onClick={() => setPasswordModal({ isOpen: false, newPw: '', confirm: '' })}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>새 비밀번호</label>
                <input type="password" placeholder="6자 이상 입력" value={passwordModal.newPw} onChange={e => setPasswordModal(p => ({ ...p, newPw: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>새 비밀번호 확인</label>
                <input type="password" placeholder="동일하게 다시 입력" value={passwordModal.confirm} onChange={e => setPasswordModal(p => ({ ...p, confirm: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handlePasswordSave()} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setPasswordModal({ isOpen: false, newPw: '', confirm: '' })}>취소</button>
              <button className="btn-primary" onClick={handlePasswordSave}>변경</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 날짜 수정 */}
      {dateEditModal.isOpen && (
        <div className="modal-overlay z-top">
          <div className="modal-content mini">
            <div className="modal-header">
              <h3><Calendar size={16}/> 날짜 수정</h3>
              <button className="btn-close" onClick={() => setDateEditModal({ isOpen: false, oldDate: '', newDate: '' })}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>기존 날짜</label>
                <input type="text" value={dateEditModal.oldDate} disabled style={{ color: 'var(--text-muted)', background: 'var(--bg)' }} />
              </div>
              <div className="form-group">
                <label>변경할 날짜</label>
                <input type="date" value={dateEditModal.newDate} onChange={e => setDateEditModal(prev => ({ ...prev, newDate: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDateEditModal({ isOpen: false, oldDate: '', newDate: '' })}>취소</button>
              <button className="btn-primary" onClick={handleDateEditSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 모달: 문자 미리보기 */}
      {isMsgModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header"><h3><MessageSquare size={16}/> 문자 피드백</h3><button className="btn-close" onClick={() => setIsMsgModalOpen(false)}><X size={20}/></button></div>
            <div className="modal-body"><textarea className="msg-preview-textarea" value={generatedMsg} readOnly /></div>
            <div className="modal-footer"><button className="btn-primary" onClick={() => { navigator.clipboard.writeText(generatedMsg); alert('복사되었습니다!'); }}><Copy size={16}/> 복사</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainApp;