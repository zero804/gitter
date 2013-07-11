for i in `cat test-users`
do
  curl -i https://track.customer.io/api/v1/customers/$i \
     -X DELETE \
     -u 603f30c8d6df16e16ed9:adb43d4655ad0897dde3
done

