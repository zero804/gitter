import unittest
import os
import smtplib

class UserInTroupeTests(unittest.TestCase):

    def testMailSend(self):
        msg = open(os.path.dirname(os.path.realpath(__file__)) + '/email.msg.eml', 'r');
        smtp = smtplib.SMTP()
        smtp.connect('localhost', 2525)
        smtp.ehlo_or_helo_if_needed()
        smtp.sendmail('testuser@troupetest.local', 'testtroupe1@beta.trou.pe', msg.read())
        smtp.quit()
