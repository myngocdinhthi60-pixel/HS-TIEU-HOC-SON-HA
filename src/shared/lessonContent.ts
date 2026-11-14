import { EXTRA_LESSONS_META } from './extraLessonsContent';
import type { PracticeTaskItem, PublicQuizQuestion, QuizQuestion, QuizQuestionResult } from './types';

export interface WatchStep {
  id: string;
  title: string;
  description: string;
  exampleTip: string;
  visualType: 'copy_paste' | 'move_to' | 'cut_paste' | 'home_row' | 'keyboard_rows' | 'tree_org' | 'search_scope';
}

export interface GuidedStep {
  id: string;
  verbTitle: string;
  instruction: string;
  exampleSideNote: string;
  hint: string;
  highlightTarget: string;
}

export interface SampleLessonBundle {
  lessonId: string;
  badgeId: string;
  badgeName: string;
  watchSteps: WatchStep[];
  guidedSteps: GuidedStep[];
  practiceMissionTitle: string;
  practiceMissionSteps: string[];
  practiceExampleNote: string;
  practiceHint: string;
  practiceTasks?: PracticeTaskItem[];
  gameTitle: string;
  gameDescription: string;
  questions: QuizQuestion[];
}

const CORE_SAMPLE_LESSONS: Record<string, SampleLessonBundle> = {
  'L4-B5': {
    lessonId: 'L4-B5',
    badgeId: 'BADGE_L4_B5',
    badgeName: 'Nhà tổ chức tệp tài ba',
    watchSteps: [
      {
        id: 'w-copy',
        title: '1. Sao chép (Copy → Paste)',
        description:
          'Khi dùng Sao chép (Copy) rồi Dán (Paste) vào thư mục đích, tệp nguồn "Gioi thieu.pptx" VẪN CÒN ở thư mục cũ và có thêm một bản mới ở thư mục đích.',
        exampleTip: 'Ví dụ: Sau Copy → Paste, "Gioi thieu.pptx" có ở cả Du lieu (D:) và Nhom 2.',
        visualType: 'copy_paste',
      },
      {
        id: 'w-moveto',
        title: '2. Di chuyển thư mục (Move to)',
        description:
          'Khi dùng Di chuyển đến (Move to), thư mục cùng toàn bộ tệp con bên trong sẽ sang vị trí mới và không còn tồn tại ở thư mục cũ nữa.',
        exampleTip: 'Ví dụ: Chuyển thư mục "Thu An" từ Nhom 1 sang Nhom 2, tệp con đi cùng luôn.',
        visualType: 'move_to',
      },
      {
        id: 'w-cut',
        title: '3. Cắt và Dán (Cut → Paste)',
        description:
          'Khi bấm Cắt (Cut), tệp hoặc thư mục chỉ được đánh dấu chờ và VẪN Ở NGUYÊN thư mục nguồn. Việc di chuyển chỉ hoàn tất khi em bấm Dán (Paste) thành công ở thư mục đích.',
        exampleTip: 'Lưu ý: Nếu mới bấm Cut mà chưa bấm Paste, tệp vẫn an toàn ở chỗ cũ!',
        visualType: 'cut_paste',
      },
    ],
    guidedSteps: [
      {
        id: 'g-copy-select',
        verbTitle: 'Bước 1 · Chọn tệp nguồn và Sao chép',
        instruction: 'Ở ổ Du lieu (D:), bấm chọn tệp "Gioi thieu.pptx", rồi bấm nút Sao chép (Copy).',
        exampleSideNote: 'Ví dụ: Bấm vào dòng "Gioi thieu.pptx" → bấm nút Sao chép ở thanh công cụ.',
        hint: 'Đảm bảo em đang mở ổ Du lieu (D:), chọn "Gioi thieu.pptx" rồi bấm nút Sao chép (Copy).',
        highlightTarget: 'btn-copy',
      },
      {
        id: 'g-paste-nhom2',
        verbTitle: 'Bước 2 · Mở Nhom 2 và Dán tệp',
        instruction: 'Mở thư mục Lop 4A2 → Nhom 2, sau đó bấm nút Dán (Paste). Quan sát tệp vẫn còn ở ổ D: và đã có thêm ở Nhom 2!',
        exampleSideNote: 'Mẹo: Nháy đúp (hoặc bấm nút Mở) vào Lop 4A2 rồi vào Nhom 2, sau đó bấm Dán.',
        hint: 'Hãy mở đúng thư mục Nhom 2 ở khung bên trái hoặc danh sách giữa, rồi bấm nút Dán (Paste).',
        highlightTarget: 'btn-paste',
      },
      {
        id: 'g-move-thuan',
        verbTitle: 'Bước 3 · Di chuyển thư mục Thu An sang Nhom 2',
        instruction: 'Mở Nhom 1, chọn thư mục "Thu An", rồi bấm "Di chuyển đến" (Move to) và chọn đích là Nhom 2 (hoặc dùng Cắt → mở Nhom 2 → Dán).',
        exampleSideNote: 'Thư mục "Thu An" cùng tệp "Ban nhap cu.txt" bên trong sẽ chuyển hết sang Nhom 2.',
        hint: 'Vào Lop 4A2 → Nhom 1, chọn "Thu An" → bấm Di chuyển đến → chọn Nhom 2.',
        highlightTarget: 'btn-move-to',
      },
      {
        id: 'g-rename',
        verbTitle: 'Bước 4 · Đổi tên tệp ở Nhom 2',
        instruction: 'Mở Nhom 2, chọn tệp "Gioi thieu.pptx", bấm Đổi tên (Rename) và đổi thành "Gioi thieu nhom.pptx".',
        exampleSideNote: 'Gõ chính xác: Gioi thieu nhom.pptx rồi bấm Lưu.',
        hint: 'Chọn tệp "Gioi thieu.pptx" đang nằm trong Nhom 2, bấm nút Đổi tên.',
        highlightTarget: 'btn-rename',
      },
      {
        id: 'g-delete-undo',
        verbTitle: 'Bước 5 · Xóa tệp nháp và Hoàn tác',
        instruction: 'Mở "Thu An" (trong Nhom 2), chọn "Ban nhap cu.txt", bấm Xóa (Delete) và xác nhận. Sau đó bấm Hoàn tác (Undo) để khôi phục lại tệp!',
        exampleSideNote: 'Luôn đọc kĩ tên tệp trong hộp xác nhận trước khi xóa nhé!',
        hint: 'Bấm Xóa "Ban nhap cu.txt" rồi bấm nút Hoàn tác (Undo) trên thanh công cụ.',
        highlightTarget: 'btn-undo',
      },
    ],
    practiceMissionTitle: 'Nhiệm vụ Tự làm: Tổ chức thư mục bài tập của em',
    practiceMissionSteps: [
      '1. Tạo một thư mục mới tên "Bai tap" (tạo trong Thu An hoặc Nhom 2).',
      '2. Sao chép (Copy → Paste) tệp "Gioi thieu.pptx" từ ổ Du lieu (D:) vào bên trong thư mục "Bai tap" (giữ nguyên tệp gốc ở ổ D:).',
      '3. Nếu "Bai tap" đang ở Thu An, hãy di chuyển thư mục "Bai tap" sang thư mục "Nhom 2".',
      '4. Mở "Bai tap" ở trong Nhom 2 và đổi tên tệp bản sao thành "Bai tap nhom.pptx".',
    ],
    practiceExampleNote: 'Cây kết quả đúng: Du lieu (D:) > Lop 4A2 > Nhom 2 > Bai tap > Bai tap nhom.pptx (và D: vẫn còn Gioi thieu.pptx).',
    practiceHint: 'Hãy kiểm tra lại 4 điều kiện ở bảng Kiểm tra: Tệp nguồn ở D: phải còn, thư mục Bai tap phải nằm trong Nhom 2 và bên trong chứa tệp tên "Bai tap nhom.pptx".',
    gameTitle: 'Trò chơi: Bưu điện tệp tin',
    gameDescription: 'Đọc yêu cầu của bưu cục: chọn đúng lệnh Sao chép (cả hai nơi đều có) hay Di chuyển (chuyển sang nơi mới) và chọn đúng thư mục nhận!',
    questions: [
      {
        id: 'L4B5-Q1',
        lessonId: 'L4-B5',
        type: 'single_choice',
        prompt: 'Khi muốn một tệp vừa tồn tại ở thư mục cũ, vừa tồn tại ở thư mục mới, em sử dụng thao tác nào?',
        options: ['Sao chép (Copy → Paste)', 'Di chuyển (Move to)', 'Xóa (Delete)', 'Đổi tên (Rename)'],
        correctAnswer: 0,
        explanation: 'Sao chép (Copy → Paste) tạo thêm một bản sao ở thư mục đích và giữ nguyên tệp ở thư mục nguồn.',
      },
      {
        id: 'L4B5-Q2',
        lessonId: 'L4-B5',
        type: 'single_choice',
        prompt: 'Sau khi em chọn tệp và bấm lệnh Cắt (Cut), nhưng CHƯA bấm Dán (Paste) ở thư mục đích thì tệp đang ở đâu?',
        options: [
          'Tệp bị mất ngay lập tức.',
          'Tệp vẫn còn ở thư mục nguồn cho đến khi Dán thành công.',
          'Tệp tự động nhảy vào thùng rác.',
          'Tệp tự động chuyển sang ổ C:.',
        ],
        correctAnswer: 1,
        explanation: 'Lệnh Cut chỉ đánh dấu mục đang chờ. Việc di chuyển chỉ thực sự diễn ra khi em thực hiện Paste thành công ở thư mục đích.',
      },
      {
        id: 'L4B5-Q3',
        lessonId: 'L4-B5',
        type: 'single_choice',
        prompt: 'Khi di chuyển một thư mục sang thư mục khác, các tệp và thư mục con bên trong nó sẽ như thế nào?',
        options: [
          'Chỉ di chuyển vỏ thư mục, các tệp con ở lại chỗ cũ.',
          'Các tệp con bị xóa hết.',
          'Tất cả tệp và thư mục con cũng di chuyển theo.',
          'Các tệp con tự động đổi tên.',
        ],
        correctAnswer: 2,
        explanation: 'Khi di chuyển (hoặc sao chép) một thư mục, toàn bộ tệp và thư mục con bên trong cũng được di chuyển (hoặc sao chép) theo.',
      },
      {
        id: 'L4B5-Q4',
        lessonId: 'L4-B5',
        type: 'single_choice',
        prompt: 'Vì sao em cần kiểm tra kĩ tên tệp và thư mục trước khi bấm nút Xóa (Delete)?',
        options: [
          'Để tránh xóa nhầm tệp quan trọng gây mất thông tin hoặc lỗi chương trình.',
          'Để máy tính chạy nhanh hơn.',
          'Để đổi tên tệp trước khi xóa.',
          'Vì nút Delete chỉ xóa được thư mục rỗng.',
        ],
        correctAnswer: 0,
        explanation: 'Xóa nhầm tệp của mình hoặc tệp hệ thống (như thư mục Windows ở ổ C:) có thể làm mất thông tin hoặc gây lỗi phần mềm.',
      },
      {
        id: 'L4B5-Q5',
        lessonId: 'L4-B5',
        type: 'matching',
        prompt: 'Hãy ghép mỗi thao tác ở cột trái với kết quả đúng ở cột phải:',
        leftItems: ['Sao chép (Copy → Paste)', 'Di chuyển (Move to)', 'Đổi tên (Rename)'],
        rightItems: [
          'Tệp có ở cả thư mục cũ và mới',
          'Tệp chỉ còn ở thư mục mới',
          'Giữ nguyên vị trí, chỉ thay tên gọi',
        ],
        correctAnswer: {
          'Sao chép (Copy → Paste)': 'Tệp có ở cả thư mục cũ và mới',
          'Di chuyển (Move to)': 'Tệp chỉ còn ở thư mục mới',
          'Đổi tên (Rename)': 'Giữ nguyên vị trí, chỉ thay tên gọi',
        },
        explanation: 'Copy tạo bản sao ở đích; Move chuyển sang đích; Rename chỉ đổi tên mà không đổi vị trí.',
      },
      {
        id: 'L4B5-Q6',
        lessonId: 'L4-B5',
        type: 'ordering',
        prompt: 'Sắp xếp đúng thứ tự các bước để sao chép tệp "Gioi thieu" từ ổ D: vào thư mục "Thu An":',
        orderItems: [
          'Mở ổ đĩa D: và nháy chọn tệp "Gioi thieu"',
          'Bấm lệnh Sao chép (Copy)',
          'Mở thư mục "Thu An"',
          'Bấm lệnh Dán (Paste)',
        ],
        correctAnswer: [
          'Mở ổ đĩa D: và nháy chọn tệp "Gioi thieu"',
          'Bấm lệnh Sao chép (Copy)',
          'Mở thư mục "Thu An"',
          'Bấm lệnh Dán (Paste)',
        ],
        explanation: 'Thứ tự chuẩn SGK tr. 25 (Hình 19): Chọn nguồn → Copy → Mở đích → Paste.',
      },
    ],
  },

  'L3-B5': {
    lessonId: 'L3-B5',
    badgeId: 'BADGE_L3_B5',
    badgeName: 'Tay gõ mười ngón',
    watchSteps: [
      {
        id: 'w-rows',
        title: '1. Khu vực chính và các hàng phím',
        description:
          'Khu vực chính của bàn phím gồm 5 hàng: Hàng phím số, Hàng phím trên, Hàng phím cơ sở, Hàng phím dưới và Hàng phím chứa phím dấu cách.',
        exampleTip: 'Chú ý: Hàng phím cơ sở là hàng ở giữa chứa các phím A S D F G H J K L ;',
        visualType: 'keyboard_rows',
      },
      {
        id: 'w-fj',
        title: '2. Hai phím có gờ F, J và vị trí xuất phát',
        description:
          'Trên hàng phím cơ sở có hai phím F và J có gờ nổi. Em đặt hai ngón trỏ lên F và J, hai ngón cái đặt vào phím cách, các ngón khác đặt lần lượt lên A, S, D và K, L, ;.',
        exampleTip: 'Sau mỗi lần vươn ngón tay gõ một phím ở hàng trên hoặc hàng dưới, ngón tay trở về vị trí xuất phát trên hàng phím cơ sở.',
        visualType: 'home_row',
      },
    ],
    guidedSteps: [
      {
        id: 'g-find-fj',
        verbTitle: 'Bước 1 · Chỉ đúng hai phím có gờ F và J',
        instruction: 'Bấm vào phím F rồi bấm vào phím J trên bàn phím mô phỏng để ghi nhớ vị trí đặt hai ngón trỏ.',
        exampleSideNote: 'Phím F do ngón trỏ trái phụ trách, phím J do ngón trỏ phải phụ trách.',
        hint: 'Tìm chữ F và chữ J ở hàng phím cơ sở (hàng có dấu gạch nổi nhỏ ở dưới chữ).',
        highlightTarget: 'key-fj',
      },
      {
        id: 'g-home-type',
        verbTitle: 'Bước 2 · Gõ cụm phím hàng cơ sở',
        instruction: 'Dùng bàn phím thật (hoặc bật chế độ nhận diện chạm trên màn hình cảm ứng) để gõ đúng cụm: asdf jkl;',
        exampleSideNote: 'Gõ sai sẽ giữ nguyên vị trí để em gõ lại đúng phím đó.',
        hint: 'Hãy nhìn ngón tay được tô sáng màu tương ứng với phím cần gõ tiếp theo.',
        highlightTarget: 'typing-box',
      },
      {
        id: 'g-reach-type',
        verbTitle: 'Bước 3 · Mở rộng sang hàng trên và hàng dưới',
        instruction: 'Gõ cụm mở rộng: er ui cv nm rồi tưởng tượng đưa ngón tay trở về hàng phím cơ sở.',
        exampleSideNote: 'Ví dụ: Ngón trỏ trái gõ F, vươn lên gõ R, xuống gõ V rồi về F.',
        hint: 'Nhìn gợi ý màu ngón tay ngay bên dưới bàn phím.',
        highlightTarget: 'typing-box',
      },
    ],
    practiceMissionTitle: 'Nhiệm vụ Tự làm: Luyện gõ 3 dãy phím đúng quy định',
    practiceMissionSteps: [
      '1. Đặt hai ngón trỏ vào phím F và J trên bàn phím thật, hai ngón cái vào phím cách.',
      '2. Hoàn thành cả 3 dãy luyện tập (Hàng phím cơ sở, Mở rộng G/H, Hàng trên & hàng dưới) với độ chính xác từ 75% trở lên.',
      '3. Đánh dấu xác nhận tư thế đặt ngón tay ở hàng phím cơ sở sau khi gõ xong.',
    ],
    practiceExampleNote: 'Gõ đều tay, không cần vội, mỗi ngón phụ trách đúng nhóm phím cùng màu.',
    practiceHint: 'Nếu lỡ gõ nhầm, em hãy nhìn ô màu nổi bật của phím và ngón tay gợi ý rồi gõ lại cho đúng.',
    gameTitle: 'Trò chơi: Đom đóm tìm phím',
    gameDescription: 'Một chú đom đóm sẽ thắp sáng một phím bất kì. Em hãy gõ đúng phím đó trên bàn phím để đưa đom đóm về tổ! Có thể bật Chế độ chậm để luyện từ từ.',
    questions: [
      {
        id: 'L3B5-Q1',
        lessonId: 'L3-B5',
        type: 'single_choice',
        prompt: 'Hai phím có gờ nổi ở hàng phím cơ sở giúp em xác định vị trí đặt hai ngón trỏ là phím nào?',
        options: ['A và S', 'F và J', 'G và H', 'K và L'],
        correctAnswer: 1,
        explanation: 'Trên hàng phím cơ sở, hai phím F và J có gờ nổi nhỏ để hai ngón trỏ đặt đúng vị trí xuất phát.',
      },
      {
        id: 'L3B5-Q2',
        lessonId: 'L3-B5',
        type: 'single_choice',
        prompt: 'Ngón tay nào thường dùng để gõ phím dấu cách (Space)?',
        options: ['Ngón út', 'Ngón trỏ', 'Ngón giữa', 'Ngón cái'],
        correctAnswer: 3,
        explanation: 'Hai ngón cái đặt lên phím dấu cách để gõ phím cách giữa các từ.',
      },
      {
        id: 'L3B5-Q3',
        lessonId: 'L3-B5',
        type: 'single_choice',
        prompt: 'Sau khi vươn ngón tay để gõ một phím ở hàng trên hoặc hàng dưới, em nên đưa ngón tay về đâu?',
        options: [
          'Giữ nguyên ngón tay ở hàng vừa gõ.',
          'Đưa ngón tay trở về vị trí xuất phát trên hàng phím cơ sở.',
          'Đặt lên hàng phím số.',
          'Nhấc cả bàn tay ra khỏi bàn phím.',
        ],
        correctAnswer: 1,
        explanation: 'Mỗi khi gõ xong một phím, em cần đưa ngón tay trở về vị trí xuất phát trên hàng phím cơ sở.',
      },
      {
        id: 'L3B5-Q4',
        lessonId: 'L3-B5',
        type: 'hotspot',
        prompt: 'Hãy bấm chọn hàng phím có chứa các phím Q, W, E, R, T, Y, U, I, O, P:',
        diagramTitle: 'Các hàng phím trong khu vực chính',
        hotspots: [
          { id: 'number', label: 'Hàng phím số', description: 'Chứa các phím 1, 2, 3, ..., 0' },
          { id: 'top', label: 'Hàng phím trên', description: 'Chứa các phím Q, W, E, R, T, Y...' },
          { id: 'home', label: 'Hàng phím cơ sở', description: 'Chứa các phím A, S, D, F, G, H, J, K, L' },
          { id: 'bottom', label: 'Hàng phím dưới', description: 'Chứa các phím Z, X, C, V, B, N, M' },
        ],
        correctAnswer: 'top',
        explanation: 'Các phím Q, W, E, R, T, Y, U, I, O, P nằm trên Hàng phím trên (ngay phía trên hàng phím cơ sở).',
      },
      {
        id: 'L3B5-Q5',
        lessonId: 'L3-B5',
        type: 'matching',
        prompt: 'Ghép mỗi ngón tay đặt ở vị trí xuất phát với phím tương ứng trên hàng phím cơ sở:',
        leftItems: ['Ngón út trái', 'Ngón trỏ trái', 'Ngón trỏ phải', 'Ngón áp út phải'],
        rightItems: ['Phím A', 'Phím F', 'Phím J', 'Phím L'],
        correctAnswer: {
          'Ngón út trái': 'Phím A',
          'Ngón trỏ trái': 'Phím F',
          'Ngón trỏ phải': 'Phím J',
          'Ngón áp út phải': 'Phím L',
        },
        explanation: 'Tay trái đặt A-S-D-F (út đến trỏ), tay phải đặt J-K-L-; (trỏ đến út).',
      },
      {
        id: 'L3B5-Q6',
        lessonId: 'L3-B5',
        type: 'single_choice',
        prompt: 'Các phím Z, X, C, V, B, N, M thuộc hàng phím nào?',
        options: ['Hàng phím trên', 'Hàng phím cơ sở', 'Hàng phím dưới', 'Hàng phím số'],
        correctAnswer: 2,
        explanation: 'Các phím Z, X, C, V, B, N, M nằm ở Hàng phím dưới (ngay phía dưới hàng phím cơ sở).',
      },
    ],
  },

  'L5-B4': {
    lessonId: 'L5-B4',
    badgeId: 'BADGE_L5_B4',
    badgeName: 'Thám tử cây thư mục',
    watchSteps: [
      {
        id: 'w-tree',
        title: '1. Cấu trúc cây thư mục hợp lí',
        description:
          'Để dễ tìm và tiết kiệm thời gian, ta phân loại tệp theo một tiêu chí rõ ràng (theo chủ sở hữu, theo loại tệp hoặc theo thời gian) và đặt tên thư mục ngắn gọn, gợi nhớ nội dung.',
        exampleTip: 'Ví dụ SGK tr. 19: Trong "Anh-Bai-tap-nhom" có 3 thư mục con là "An", "Khoa", "Minh", ảnh của bạn nào đặt vào thư mục của bạn đó.',
        visualType: 'tree_org',
      },
      {
        id: 'w-search',
        title: '2. Công cụ tìm kiếm và phạm vi thư mục đang mở',
        description:
          'Khi gõ từ khóa vào ô tìm kiếm trong File Explorer và nhấn Enter, máy tính sẽ tìm kiếm BÊN TRONG thư mục đang mở và các thư mục con của nó. Nếu cần tìm ở nơi khác, em hãy mở thư mục rộng hơn (ví dụ ổ D:).',
        exampleTip: 'Bấm "Mở vị trí tệp" (Open file location) ở kết quả để nhảy ngay tới thư mục chứa tệp đó!',
        visualType: 'search_scope',
      },
    ],
    guidedSteps: [
      {
        id: 'g-open-scope',
        verbTitle: 'Bước 1 · Mở thư mục Anh-Bai-tap-nhom',
        instruction: 'Trong cây thư mục, bấm mở "Anh-Bai-tap-nhom" (quan sát thanh đường dẫn hiển thị Local Disk (D:) > Anh-Bai-tap-nhom).',
        exampleSideNote: 'Chú ý: Tệp "Ki-nghi-he.pptx" đang nằm ở "Ho-so-hoc-tap" (bên ngoài thư mục này).',
        hint: 'Nháy đúp hoặc bấm vào "Anh-Bai-tap-nhom" để mở.',
        highlightTarget: 'tree-anh-nhom',
      },
      {
        id: 'g-search-thantho',
        verbTitle: 'Bước 2 · Tìm tệp trong phạm vi thư mục đang mở',
        instruction: 'Bấm vào ô Tìm kiếm, gõ "Ho-Than-tho" rồi nhấn Enter (hoặc bấm nút Tìm).',
        exampleSideNote: 'Kết quả chỉ tìm trong Anh-Bai-tap-nhom và các thư mục con An, Khoa, Minh.',
        hint: 'Gõ chính xác cụm "Ho-Than-tho" vào ô tìm kiếm khi đang mở Anh-Bai-tap-nhom.',
        highlightTarget: 'search-input',
      },
      {
        id: 'g-open-loc',
        verbTitle: 'Bước 3 · Dùng "Mở vị trí tệp" (Open file location)',
        instruction: 'Ở dòng kết quả "Ho-Than-tho.jpg", bấm nút "Mở vị trí tệp" để đi tới đúng thư mục "Khoa" chứa tệp đó.',
        exampleSideNote: 'Lệnh này rất hữu ích khi em chỉ nhớ tên tệp mà quên tệp nằm ở thư mục con nào.',
        hint: 'Bấm nút "Mở vị trí tệp" ngay bên cạnh kết quả tìm kiếm Ho-Than-tho.jpg.',
        highlightTarget: 'btn-open-location',
      },
    ],
    practiceMissionTitle: 'Nhiệm vụ Tự làm: Sắp xếp cây thư mục và tìm kiếm đúng phạm vi',
    practiceMissionSteps: [
      '1. Trong "Ho-so-cua-em", hãy tạo ít nhất 2 thư mục con có tên rõ nghĩa (ví dụ: Van-ban, Hinh-anh, Trinh-chieu).',
      '2. Di chuyển cả 3 tệp (Bai-tap-Tin-hoc.docx, Phong-canh-que-huong.jpg, Trinh-chieu-nhom.pptx) vào các thư mục con phù hợp.',
      '3. Mở lại "Ho-so-cua-em", dùng ô Tìm kiếm gõ "Trinh-chieu-nhom" để tìm.',
      '4. Bấm "Mở vị trí tệp" trên kết quả tìm được.',
    ],
    practiceExampleNote: 'Bài mở chấp nhận nhiều cách chia hợp lí miễn có >= 2 thư mục con và phân loại cả 3 tệp rõ ràng.',
    practiceHint: 'Dùng nút "Tạo thư mục" để tạo thư mục con, dùng "Di chuyển đến" (hoặc Cắt → Dán) để xếp từng tệp vào thư mục con, rồi tìm kiếm từ Ho-so-cua-em.',
    gameTitle: 'Trò chơi: Thám tử tìm tệp',
    gameDescription: 'Đọc 3 manh mối về tên, loại tệp và nơi lưu trữ. Mở đúng thư mục phạm vi, tìm kiếm và bấm Mở vị trí tệp để phá án!',
    questions: [
      {
        id: 'L5B4-Q1',
        lessonId: 'L5-B4',
        type: 'single_choice',
        prompt: 'Khi em đang mở thư mục "Anh-Bai-tap-nhom", gõ "Ho-Than-tho" vào ô tìm kiếm và nhấn Enter, ứng dụng sẽ tìm ở đâu?',
        options: [
          'Chỉ tìm trong thư mục An.',
          'Tìm trong thư mục "Anh-Bai-tap-nhom" và các thư mục con của nó.',
          'Tìm trên toàn bộ Internet.',
          'Tìm trong cả ổ C: và thùng rác.',
        ],
        correctAnswer: 1,
        explanation: 'Công cụ tìm kiếm của File Explorer sẽ tìm trong thư mục đang mở ("Anh-Bai-tap-nhom") và toàn bộ thư mục con bên trong nó.',
      },
      {
        id: 'L5B4-Q2',
        lessonId: 'L5-B4',
        type: 'single_choice',
        prompt: 'Nếu đang mở thư mục "An" và tìm tệp "Ho-Than-tho.jpg" (nằm trong thư mục "Khoa" cùng cấp với "An") thì kết quả sẽ thế nào?',
        options: [
          'Vẫn tìm thấy bình thường.',
          'Không tìm thấy, vì "Khoa" không nằm bên trong thư mục "An".',
          'Máy tính tự chuyển tệp sang thư mục An.',
          'Tệp bị ẩn đi vĩnh viễn.',
        ],
        correctAnswer: 1,
        explanation: 'Tìm kiếm chỉ quét bên trong thư mục đang mở ("An"). Muốn thấy tệp ở "Khoa", cần mở thư mục cha "Anh-Bai-tap-nhom" hoặc ổ D:.',
      },
      {
        id: 'L5B4-Q3',
        lessonId: 'L5-B4',
        type: 'single_choice',
        prompt: 'Trong kết quả tìm kiếm, để mở ngay thư mục đang chứa tệp đó, em chọn lệnh nào?',
        options: ['Rename', 'Delete', 'Open file location (Mở vị trí tệp)', 'New folder'],
        correctAnswer: 2,
        explanation: 'Nháy phải chuột vào kết quả và chọn Open file location (Mở vị trí tệp) sẽ đưa em tới thẳng thư mục lưu tệp.',
      },
      {
        id: 'L5B4-Q4',
        lessonId: 'L5-B4',
        type: 'single_choice',
        prompt: 'Việc đặt tên thư mục và tệp rõ ràng, thống nhất (ví dụ: Anh-Bai-tap-nhom, San-bay-Cam-Ranh.jpg) giúp ích gì?',
        options: [
          'Giúp dễ nhớ nội dung, phân biệt và tìm kiếm nhanh hơn.',
          'Giúp tăng dung lượng ổ cứng.',
          'Giúp máy tính không cần dùng điện.',
          'Giúp ảnh tự động đẹp hơn.',
        ],
        correctAnswer: 0,
        explanation: 'Đặt tên rõ ràng, thống nhất và gợi nhớ nội dung giúp người dùng nhận biết nhanh và tìm kiếm chính xác.',
      },
      {
        id: 'L5B4-Q5',
        lessonId: 'L5-B4',
        type: 'single_choice',
        prompt: 'Để tạo cấu trúc cây thư mục hợp lí lưu bài tập các năm học Lop-3A, Lop-4A, Lop-5A của bạn An, cách sắp xếp nào là hợp lí nhất?',
        options: [
          'Để chung tất cả ảnh, văn bản, trình chiếu vào một thư mục duy nhất.',
          'Tạo thư mục An → bên trong tạo Lop-3A, Lop-4A, Lop-5A → trong mỗi lớp tạo thư mục loại tệp (Anh-va-Video, Van-ban-va-Trinh-chieu).',
          'Đặt thư mục Lop-4A nằm bên trong thư mục Lop-3A, rồi Lop-5A nằm trong Lop-4A.',
          'Đặt tên các thư mục là 1, 2, 3 không có chữ gợi nhớ.',
        ],
        correctAnswer: 1,
        explanation: 'Theo SGK tr. 23 (Luyện tập Câu 1 - Phương án B), các lớp ngang cấp nằm trong thư mục cá nhân "An", mỗi lớp lại chia theo loại tệp rất khoa học.',
      },
      {
        id: 'L5B4-Q6',
        lessonId: 'L5-B4',
        type: 'ordering',
        prompt: 'Sắp xếp thứ tự các bước tìm lại tệp trình chiếu "Ki-nghi-he" trên ổ đĩa D: (SGK tr. 22):',
        orderItems: [
          'Mở cửa sổ This PC',
          'Chọn ổ đĩa D: ở khung bên trái để đặt phạm vi tìm kiếm',
          'Bấm vào ô tìm kiếm, nhập từ khóa "Ki-nghi-he" và nhấn Enter',
          'Chọn kết quả hoặc bấm Mở vị trí tệp để xem thư mục lưu tệp',
        ],
        correctAnswer: [
          'Mở cửa sổ This PC',
          'Chọn ổ đĩa D: ở khung bên trái để đặt phạm vi tìm kiếm',
          'Bấm vào ô tìm kiếm, nhập từ khóa "Ki-nghi-he" và nhấn Enter',
          'Chọn kết quả hoặc bấm Mở vị trí tệp để xem thư mục lưu tệp',
        ],
        explanation: 'Thứ tự chuẩn trong Nhiệm vụ 2 (SGK Tin học 5 tr. 22): Mở This PC → Chọn ổ đĩa D: → Nhập từ khóa và nhấn Enter → Mở tệp/vị trí tệp.',
      },
    ],
  },
};

function buildExtraBundles(): Record<string, SampleLessonBundle> {
  const result: Record<string, SampleLessonBundle> = {};
  for (const [id, meta] of Object.entries(EXTRA_LESSONS_META)) {
    const isKeyboard = id === 'L4-B2' || id === 'CHUNG-BAN-PHIM';
    const isFolder = id === 'CHUNG-TEP-THU-MUC';

    const guidedSteps: GuidedStep[] = isKeyboard
      ? CORE_SAMPLE_LESSONS['L3-B5'].guidedSteps.map((s) => ({ ...s }))
      : isFolder
        ? CORE_SAMPLE_LESSONS['L4-B5'].guidedSteps.map((s) => ({ ...s }))
        : [
            {
              id: `${id}-guided-1`,
              verbTitle: meta.guidedTitle,
              instruction: meta.guidedInstruction,
              exampleSideNote: meta.guidedExampleNote,
              hint: meta.guidedHint,
              highlightTarget: 'tasks-panel',
            },
          ];

    result[id] = {
      lessonId: meta.lessonId,
      badgeId: meta.badgeId,
      badgeName: meta.badgeName,
      watchSteps: [
        {
          id: `${id}-watch-1`,
          title: meta.watchTitle,
          description: meta.watchDescription,
          exampleTip: meta.watchExampleTip,
          visualType: isKeyboard ? 'home_row' : isFolder ? 'copy_paste' : 'tree_org',
        },
      ],
      guidedSteps,
      practiceMissionTitle: meta.practiceMissionTitle,
      practiceMissionSteps: meta.practiceMissionSteps,
      practiceExampleNote: meta.practiceExampleNote,
      practiceHint: meta.practiceHint,
      practiceTasks: meta.practiceTasks,
      gameTitle: meta.gameTitle,
      gameDescription: meta.gameDescription,
      questions: meta.questions,
    };
  }
  return result;
}

export const SAMPLE_LESSONS: Record<string, SampleLessonBundle> = {
  ...CORE_SAMPLE_LESSONS,
  ...buildExtraBundles(),
};

export function gradePracticeTasks(
  tasks: PracticeTaskItem[],
  taskAnswers: Record<string, number>,
): {
  passed: boolean;
  feedback: string;
  checks: Array<{ id: string; label: string; ok: boolean; hint: string }>;
} {
  if (!tasks.length) {
    return {
      passed: false,
      feedback: 'Chưa có bài tập thực hành cho bài học này.',
      checks: [],
    };
  }
  let okCount = 0;
  const checks = tasks.map((t, idx) => {
    const selected = taskAnswers[t.id];
    const ok = Number(selected) === t.correctIndex;
    if (ok) okCount++;
    return {
      id: t.id,
      label: `Nhiệm vụ ${idx + 1}: ${t.prompt.slice(0, 65)}${t.prompt.length > 65 ? '...' : ''}`,
      ok,
      hint: t.hint,
    };
  });
  const passed = okCount === tasks.length;
  return {
    passed,
    feedback: passed
      ? `Tuyệt vời! Em đã hoàn thành chính xác cả ${tasks.length}/${tasks.length} tình huống thực hành.`
      : `Em đã làm đúng ${okCount}/${tasks.length} tình huống. Hãy xem gợi ý ở các mục [Chưa đạt] và chọn lại nhé!`,
    checks,
  };
}

export function toPublicQuestions(questions: QuizQuestion[]): PublicQuizQuestion[] {
  return questions.map(({ correctAnswer: _c, explanation: _e, ...rest }) => rest);
}

export function gradeQuizAnswers(
  questions: QuizQuestion[],
  answers: Record<string, unknown>,
  includeSolutions: boolean,
): {
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  results: QuizQuestionResult[];
} {
  let correctCount = 0;
  const results: QuizQuestionResult[] = questions.map((q) => {
    const ans = answers[q.id];
    let isCorrect = false;
    if (q.type === 'single_choice') {
      isCorrect = Number(ans) === Number(q.correctAnswer);
    } else if (q.type === 'hotspot') {
      isCorrect = String(ans ?? '') === String(q.correctAnswer);
    } else if (q.type === 'ordering') {
      const expected = q.correctAnswer as string[];
      isCorrect =
        Array.isArray(ans) &&
        ans.length === expected.length &&
        expected.every((val, i) => ans[i] === val);
    } else if (q.type === 'matching') {
      const expected = q.correctAnswer as Record<string, string>;
      if (ans && typeof ans === 'object' && !Array.isArray(ans)) {
        const record = ans as Record<string, string>;
        const keys = Object.keys(expected);
        isCorrect = keys.every((k) => record[k] === expected[k]);
      }
    }

    if (isCorrect) correctCount++;

    return {
      questionId: q.id,
      correct: isCorrect,
      studentAnswer: ans ?? null,
      ...(includeSolutions
        ? {
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
          }
        : {}),
    };
  });

  const totalCount = questions.length;
  const scorePercent = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  return { scorePercent, correctCount, totalCount, results };
}
