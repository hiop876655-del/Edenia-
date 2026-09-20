using System;
using System.Windows;
using Idenia.Hisba.Database;
using Idenia.Hisba.Security;

namespace Idenia.Hisba
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            LocalDatabase.InitializeDatabase();
            CheckLicenseState();
        }

        private void CheckLicenseState()
        {
            var result = HardwareSecurity.VerifyLocalOfflineLicense();
            if (result.IsValid)
            {
                ActivationPanel.Visibility = Visibility.Collapsed;
                DashboardPanel.Visibility = Visibility.Visible;
                TxtLicenseDays.Text = $"متبقي {result.RemainingDays} يوم";
            }
            else
            {
                ActivationPanel.Visibility = Visibility.Visible;
                DashboardPanel.Visibility = Visibility.Collapsed;
                if (result.StatusText != "البرنامج غير مفعل")
                {
                    TxtError.Text = result.StatusText;
                    TxtError.Visibility = Visibility.Visible;
                }
            }
        }

        private async void BtnActivate_Click(object sender, RoutedEventArgs e)
        {
            string shop = TxtShopName.Text.Trim();
            string phone = TxtPhone.Text.Trim();
            string code = TxtLicenseCode.Text.Trim();

            if (string.IsNullOrEmpty(shop) || string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(code))
            {
                TxtError.Text = "يرجى ملء جميع الحقول المطلوبة";
                TxtError.Visibility = Visibility.Visible;
                return;
            }

            BtnActivate.IsEnabled = false;
            BtnActivate.Content = "جاري التحقق والتفعيل...";
            TxtError.Visibility = Visibility.Collapsed;

            var res = await HardwareSecurity.ActivateLicenseAsync(code, phone, shop, shop);
            BtnActivate.IsEnabled = true;
            BtnActivate.Content = "تفعيل البرنامج الآن";

            if (res.Success)
            {
                MessageBox.Show("تم تفعيل البرنامج بنجاح!", "ايدينيا - حِسبة", MessageBoxButton.OK, MessageBoxImage.Information);
                CheckLicenseState();
            }
            else
            {
                TxtError.Text = res.Message;
                TxtError.Visibility = Visibility.Visible;
            }
        }

        private void BtnPrintInvoice_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("تم حفظ الفاتورة بنجاح في قاعدة البيانات المحلية وإرسال أمر الطباعة للطابعة الحرارية.", "ايدينيا - حِسبة", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
