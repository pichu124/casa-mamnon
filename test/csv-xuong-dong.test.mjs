// Ô CSV CHỨA XUỐNG DÒNG (Excel Alt+Enter) KHÔNG ĐƯỢC BẺ GÃY BẢN GHI.
//
// Excel cho xuống dòng trong một ô; lưu CSV thì ô đó thành "dòng một\ndòng
// hai" trong ngoặc kép. Bộ phân tích cũ tách theo dòng vật lý TRƯỚC khi xét
// ngoặc kép, nên một ghi chú hai dòng trong danh sách bé làm mọi cột phía sau
// lệch sang một bản ghi ma — kiểu hỏng dữ liệu im lặng khi nhập từ Excel.
import path from 'path';
import { createRequire } from 'module';
import { taoBoDem, GOC } from './_chung.mjs';

const require_ = createRequire(import.meta.url);
const csv = require_(path.join(GOC, 'lib', 'csv.js'));
const { check, tongKet } = taoBoDem();

console.log('\n[1] Ô có xuống dòng bên trong ngoặc kép');
{
  const r = csv.parse('ten,ghichu,lop\n"Bé An","dị ứng tôm\nvà đậu phộng",Chồi 2\nBé Hai,ok,Lá 1');
  check('đúng 2 bản ghi, không phải 3', r.rows.length === 2, r.rows.length);
  check('ô ghi chú giữ nguyên cả hai dòng',
    r.rows[0] && r.rows[0].ghichu === 'dị ứng tôm\nvà đậu phộng', r.rows[0] && r.rows[0].ghichu);
  check('cột đứng sau ô hai dòng không bị lệch',
    r.rows[0] && r.rows[0].lop === 'Chồi 2', r.rows[0] && r.rows[0].lop);
  check('bản ghi thường phía sau vẫn đọc đúng',
    r.rows[1] && r.rows[1].ten === 'Bé Hai' && r.rows[1].lop === 'Lá 1', r.rows[1]);
}

console.log('\n[2] Đi một vòng stringify → parse không mất gì');
{
  const headers = ['ten', 'ghichu'];
  const rows = [{ ten: 'Bé "Bin"', ghichu: 'hen suyễn,\ncó ống hít ở balo' }];
  const r = csv.parse(csv.stringify(headers, rows));
  check('tên có nháy kép sống sót', r.rows[0] && r.rows[0].ten === 'Bé "Bin"', r.rows[0] && r.rows[0].ten);
  check('ghi chú có dấu phẩy + xuống dòng sống sót',
    r.rows[0] && r.rows[0].ghichu === 'hen suyễn,\ncó ống hít ở balo', r.rows[0] && r.rows[0].ghichu);
}

console.log('\n[3] Những gì đang chạy không đổi');
{
  const r = csv.parse('ten;sdt\nBé Ba;0900 000 000\n\nBé Tư;0911 111 111');
  check('chấm phẩy kiểu Excel tiếng Việt vẫn nhận ra', r.separator === ';', r.separator);
  check('dòng trống vẫn được bỏ qua như cũ', r.rows.length === 2, r.rows.length);
  check('CRLF vẫn đọc đúng', csv.parse('a,b\r\n1,2\r\n').rows.length === 1);
}

tongKet();
